require('dotenv').config();
const path = require('path');
const { createSha1Hash, stripHTML } = require('hexo-util');
const { webpack, DefinePlugin, HotModuleReplacementPlugin } = require('webpack');
const MemoryFS = require('memory-fs');
const TerserPlugin = require('terser-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { default: webpackDevMiddleware } = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

const context = path.resolve(__dirname, '../lib');
const outputPath = 'assets';
const decryptionLoader = { loader: 'decryption-loader', options: { password: process.env.DECRYPTION_PASSWORD } };
const fileLoader = {
  loader: 'file-loader',
  options: {
    outputPath,
    name(resource) {
      const original = path.basename(resource, '.cast5');
      const ext = path.extname(original);
      return `${path.basename(original, ext)}.[contenthash:8]${ext}`;
    },
  },
};
const options = {
  context,
  mode: 'production',
  entry: './main.js',
  output: { filename: '[name].[contenthash:8].js', path: context },
  infrastructureLogging: { level: 'none' },
  stats: { colors: true, maxModules: Infinity },
  performance: { maxAssetSize: 666 * 1024, maxEntrypointSize: 666 * 1024 },
  optimization: {
    minimizer: [new TerserPlugin({ parallel: true, terserOptions: { safari10: true } })],
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\/assets\/.*\.json$/, type: 'javascript/auto', use: fileLoader },
      { test: /\.bdf.cast5$/, use: [{ loader: 'bdf2fnt-loader', options: { outputPath } }, decryptionLoader] },
      {
        test: /\.png.cast5$/,
        oneOf: [{
          test: /\.font\./,
          use: ({ resource }) => [{
            loader: 'png2fnt-loader',
            options: {
              ...fileLoader.options,
              ...{
                dark: { ignoreColumns: [123], chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-+/\\' },
              }[path.basename(resource.substring(0, resource.indexOf('.font')))],
            },
          }, decryptionLoader],
        }, { use: [fileLoader, decryptionLoader] }],
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      'typeof CANVAS_RENDERER': JSON.stringify(true),
      'typeof WEBGL_RENDERER': JSON.stringify(true),
      'typeof EXPERIMENTAL': JSON.stringify(false),
      'typeof PLUGIN_CAMERA3D': JSON.stringify(false),
      'typeof PLUGIN_FBINSTANT': JSON.stringify(false),
      'typeof FEATURE_SOUND': JSON.stringify(false),
    }),
    new BundleAnalyzerPlugin({
      logLevel: 'silent',
      openAnalyzer: false,
      analyzerMode: 'static',
      reportFilename: path.resolve(__dirname, '../../../report.html'),
    }),
    new InjectManifest({
      swSrc: path.resolve(__dirname, '../lib/serviceWorker.js'),
      dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
    }),
  ],
};
const baseCharset = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.0123456789';

let compiler;
let chunks;
let dev;

function buildCompiler() {
  compiler = webpack(options);
  compiler.outputFileSystem = new MemoryFS();
  compiler.hooks.infrastructureLog.tap('cruzdanilo', (name, level, args) => args
    .forEach((arg) => arg.split('\n')
      .forEach((l) => hexo.log[level](`[${{ 'webpack-dev-middleware': 'wdm' }[name] || name}]`, l))));
  compiler.hooks.afterEmit.tap('cruzdanilo', (compilation) => {
    if (compilation.errors.length) return;
    chunks = [...compilation.namedChunks.values()].flatMap(({ files }) => [...files]);
  });
}

hexo.extend.generator.register('cruzdanilo', (locals) => new Promise((resolve) => {
  if (!compiler) buildCompiler();
  const charset = [...locals.posts.reduce((set, post) => {
    Array.from(post.title + stripHTML(post.content)).forEach((c) => set.add(c));
    return set;
  }, new Set(baseCharset))].filter((ch) => /[ \S]/.test(ch)).sort().join('');
  compiler.options.module.rules
    .filter((r) => r.use && r.use.loader === 'bdf2fnt-loader')
    .forEach((r) => Object.assign(r.use.options, { charset }));

  async function cruzdanilo(stats) {
    resolve(stats.hasErrors() ? null : await Promise.all(Object.keys(stats.compilation.assets)
      .map((k) => new Promise((resolveFile) => {
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
        stats.toString(options.stats).split('\n').forEach((l) => hexo.log.info('[cruzdanilo]', l));
        await cruzdanilo(stats);
      }
    });
  }
}));

hexo.extend.helper.register('main', function main() {
  return chunks.reduce((res, f) => `${res}\n<script async defer src="${this.url_for(f)}"></script>`,
    '<script>document.body.className = \'game\';</script>');
});

hexo.extend.helper.register('cover', function cover(item) {
  const asset = hexo.model('PostAsset').findOne({
    post: item._id, // eslint-disable-line no-underscore-dangle
    slug: item.cover_image,
  });
  return asset ? this.url_for(asset.path) : null;
});

hexo.extend.filter.register('server_middleware', (app) => {
  const hmrEndpoint = '/webpack.hmr';
  options.mode = 'development';
  options.devtool = 'eval-source-map';
  options.output.filename = '[name].js';
  options.entry = [options.entry, `webpack-hot-middleware/client?reload=true&path=${hmrEndpoint}`];
  options.plugins.push(new HotModuleReplacementPlugin());
  options.plugins.find((plugin) => plugin instanceof InjectManifest).config.exclude = [/.*/];
  buildCompiler();
  dev = webpackDevMiddleware(compiler);
  app.use(dev);
  const hot = webpackHotMiddleware(compiler, {
    path: hmrEndpoint,
    log: (...args) => args.forEach((a) => a.split('\n').forEach((l) => hexo.log.info('[whm]', l))),
  });
  app.use(hot);
  const hashes = new Map();
  hexo.on('generateAfter', async () => {
    const reload = (await Promise.all(hexo.route.list()
      .filter((route) => !dev.context.stats.compilation.assets[route])
      .filter((route) => hexo.route.isModified(route))
      .map(async (route) => {
        const hash = await new Promise((resolve, reject) => {
          const sha1 = createSha1Hash();
          hexo.route.get(route).pipe(sha1)
            .on('error', reject)
            .on('finish', () => resolve(sha1.read().toString('hex')));
        });
        const lastHash = hashes.get(route);
        hashes.set(route, hash);
        return !!lastHash && lastHash !== hash;
      }))).find(Boolean);
    if (reload) hot.publish({ action: 'reload' });
  });
});
