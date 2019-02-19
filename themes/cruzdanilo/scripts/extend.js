/* eslint-env node */
/* global hexo */
const path = require('path');
const MemoryFS = require('memory-fs');
const webpack = require('webpack');
const { HashStream, stripHTML } = require('hexo-util');
// const { GenerateSW } = require('workbox-webpack-plugin');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

const context = path.resolve(__dirname, '../lib');
const outputPath = 'assets';
const options = {
  context,
  entry: './main.js',
  output: { filename: '[name].[chunkhash:8].js', path: context },
  mode: 'production',
  performance: { maxAssetSize: 2 * 1024 * 1024, maxEntrypointSize: 2 * 1024 * 1024 },
  module: {
    rules: [
      { test: [/\.vert$/, /\.frag$/], use: 'raw-loader' },
      { test: /\.bdf$/, use: { loader: 'bdf2fnt-loader', options: { outputPath } } },
      {
        test: /\.png$/,
        oneOf: [
          { test: /eighties/, use: { loader: 'png2fnt-loader', options: { ignoreColumns: [284], chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:?!-_~#"\'&()[]|`/\\@°+=*%€$£¢<>©®' } } },
          { use: { loader: 'file-loader', options: { name: '[name].[hash:8].[ext]', outputPath } } },
        ],
      },
    ],
  },
  plugins: [
    // new GenerateSW({ clientsClaim: true, skipWaiting: true }),
    new webpack.DefinePlugin({
      CANVAS_RENDERER: JSON.stringify(true),
      WEBGL_RENDERER: JSON.stringify(true),
    }),
  ],
  stats: {
    all: true,
    colors: true,
    assetsSort: 'name',
    maxModules: Infinity,
    reasons: false,
    cached: false,
    optimizationBailout: false,
  },
};
const baseCharset = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.0123456789';

let compiler;
let mainjs;
let dev;

function buildCompiler() {
  compiler = webpack(options);
  compiler.outputFileSystem = new MemoryFS();
  compiler.hooks.afterEmit.tap('cruzdanilo', (compilation) => {
    if (compilation.errors.length) return;
    [mainjs] = compilation.namedChunks.get('main').files;
  });
}

hexo.extend.generator.register('cruzdanilo', locals => new Promise((resolve) => {
  if (!compiler) buildCompiler();
  const charset = [...locals.posts.reduce((set, post) => {
    Array.from(post.title + stripHTML(post.content)).forEach(c => set.add(c));
    return set;
  }, new Set(baseCharset))].filter(ch => /[ \S]/.test(ch)).sort().join('');
  compiler.options.module.rules
    .filter(r => r.use && r.use.loader === 'bdf2fnt-loader')
    .forEach(r => Object.assign(r.use.options, { charset }));

  async function cruzdanilo(stats) {
    resolve(stats.hasErrors() ? null : await Promise.all(Object.keys(stats.compilation.assets)
      .map(k => new Promise((resolveFile) => {
        const absPath = path.join(compiler.outputPath, k);
        compiler.outputFileSystem.readFile(absPath, (err, data) => resolveFile({
          path: k,
          data: err ? null : data,
        }));
      }))));
  }

  if (dev) {
    if (charset !== dev.charset) {
      dev.charset = charset;
      dev.invalidate(cruzdanilo);
    } else dev.waitUntilValid(cruzdanilo);
  } else {
    compiler.run(async (err, stats) => {
      if (err) resolve(null);
      else {
        hexo.log.info(`cruzdanilo\n${stats.toString(options.stats)}`);
        await cruzdanilo(stats);
      }
    });
  }
}));

hexo.extend.helper.register('main', function main() {
  return `<script>document.body.className = 'game';</script>
<script async defer src="${this.url_for(mainjs)}"></script>`;
});

hexo.extend.helper.register('cover', function cover(item) {
  const asset = hexo.model('PostAsset').findOne({
    post: item._id, // eslint-disable-line no-underscore-dangle
    slug: item.cover_image,
  });
  return asset ? this.url_for(asset.path) : null;
});

hexo.extend.filter.register('server_middleware', (app) => {
  options.mode = 'development';
  options.devtool = 'eval-source-map';
  options.output.filename = '[name].js';
  const hmrEndpoint = '/webpack.hmr';
  options.module.rules.push({
    include: path.resolve(context, options.entry),
    use: {
      loader: require.resolve('./hmr-loader'),
      options: { path: hmrEndpoint, reload: true },
    },
  });
  options.plugins.push(new webpack.HotModuleReplacementPlugin());
  buildCompiler();
  dev = webpackDevMiddleware(compiler, {
    publicPath: compiler.options.output.publicPath,
    logger: hexo.log,
    stats: options.stats,
  });
  app.use(dev);
  const hot = webpackHotMiddleware(compiler, {
    path: hmrEndpoint,
    log: hexo.log.info.bind(hexo.log),
  });
  app.use(hot);
  const hashes = new Map();
  hexo.on('generateAfter', async () => {
    const reload = (await Promise.all(hexo.route.list()
      .filter(route => !dev.context.webpackStats.compilation.assets[route])
      .filter(route => hexo.route.isModified(route))
      .map(async (route) => {
        const hash = await new Promise((resolve, reject) => {
          const stream = new HashStream();
          hexo.route.get(route).pipe(stream)
            .on('error', reject)
            .on('finish', () => resolve(stream.read().toString('hex')));
        });
        const lastHash = hashes.get(route);
        hashes.set(route, hash);
        return !!lastHash && lastHash !== hash;
      }))).find(Boolean);
    if (reload) hot.publish({ action: 'reload' });
  });
});
