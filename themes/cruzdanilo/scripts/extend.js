/* eslint-env node */
/* global hexo */
const path = require('path');
const MemoryFS = require('memory-fs');
const webpack = require('webpack');
const { HashStream } = require('hexo-util');
const { GenerateSW } = require('workbox-webpack-plugin');
const TexturePackerPlugin = require('texture-packer-webpack-plugin');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

const context = path.resolve(__dirname, '../lib');
const outputPath = 'assets';
const texturePacker = new TexturePackerPlugin({ outputPath });
const options = {
  context,
  entry: './main.js',
  output: { filename: '[name].[chunkhash:6].js', path: context },
  mode: 'production',
  performance: { maxAssetSize: 1024 * 1024, maxEntrypointSize: 1024 * 1024 },
  module: {
    rules: [
      {
        test: /cocos2d-html5\//,
        use: {
          loader: 'cocos2d-loader',
          options: {
            modules: ['base4webgl', 'actions', 'ccui'],
            exports: ['cc', 'ccui'],
          },
        },
      },
      { test: /\.png$/, use: TexturePackerPlugin.loader({ outputPath }) },
      { test: /\.bdf$/, use: { loader: 'bdf2fnt-loader', options: { outputPath } } },
    ],
  },
  plugins: [
    texturePacker,
    new GenerateSW({ clientsClaim: true, skipWaiting: true }),
  ],
  stats: {
    all: true,
    colors: true,
    assetsSort: 'name',
    maxModules: Infinity,
    reasons: false,
    cached: false,
  },
};

let compiler;
let mainjs;
function buildCompiler() {
  compiler = webpack(options);
  compiler.outputFileSystem = new MemoryFS();
  compiler.hooks.afterEmit.tap('cruzdanilo', (compilation) => {
    if (compilation.errors.length) return;
    [mainjs] = compilation.namedChunks.get('main').files;
  });
}

let dev;
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
    const reload = (await Promise.all(hexo.route.list().map(async (routePath) => {
      if (dev.context.webpackStats.compilation.assets[routePath]) return false;
      const route = hexo.route.get(routePath);
      if (!route.modified) return false;
      const hash = await new Promise((resolve, reject) => {
        const stream = new HashStream();
        route.pipe(stream)
          .on('error', reject)
          .on('finish', () => resolve(stream.read().toString('hex')));
      });
      const lastHash = hashes.get(routePath);
      hashes.set(routePath, hash);
      return !!lastHash && lastHash !== hash;
    }))).find(Boolean);
    if (reload) hot.publish({ action: 'reload' });
  });
});

hexo.extend.generator.register('cruzdanilo', () => new Promise((resolve) => {
  function handle(stats) {
    resolve(stats.hasErrors() ? null : Object.entries(stats.compilation.assets).map(([k, v]) => ({
      path: k,
      data: { data: v.source(), modified: v.emitted },
    })));
  }
  if (dev) dev.waitUntilValid(stats => handle(stats));
  else {
    if (!compiler) buildCompiler();
    compiler.run((err, stats) => {
      if (err) resolve(null);
      else {
        hexo.log.info(`cruzdanilo\n${stats.toString(options.stats)}`);
        handle(stats);
      }
    });
  }
}));

hexo.extend.helper.register('main', function main() {
  return `  <script>
const articles = Array.from(document.getElementsByTagName('article'));
articles.forEach(el => { el.style.display = 'none'; });
const atlases = ${JSON.stringify(texturePacker.results)};
  </script>
  <script async defer src="${this.url_for(mainjs)}"></script>
`;
});

hexo.extend.helper.register('cover', function cover(item) {
  const asset = hexo.model('PostAsset').findOne({
    post: item._id, // eslint-disable-line no-underscore-dangle
    slug: item.cover_image,
  });
  return asset ? this.url_for(asset.path) : null;
});
