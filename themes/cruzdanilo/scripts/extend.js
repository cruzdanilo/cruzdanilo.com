require('dotenv').config();
const { stringify } = require('json5');
const { createHash } = require('crypto');
const { js: beautify } = require('js-beautify');
const { cyan, magenta } = require('chalk');
const { interpolateName } = require('loader-utils');
const { Volume, createFsFromVolume } = require('memfs');
const { stripHTML, url_for: unboundUrlFor } = require('hexo-util');
const { webpack, DefinePlugin, HotModuleReplacementPlugin } = require('webpack');
const { InjectManifest } = require('workbox-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { default: webpackDevMiddleware } = require('webpack-dev-middleware');
const TerserPlugin = require('terser-webpack-plugin');
const webpackHotMiddleware = require('webpack-hot-middleware');
const filesize = require('filesize');
const imagemin = require('imagemin').buffer;
const mozjpeg = require('imagemin-mozjpeg');
const optipng = require('imagemin-optipng');
const path = require('path');
const {
  createReadStream, exists, readFile, writeFile,
} = require('hexo-fs');

const urlFor = unboundUrlFor.bind(hexo);
const cachePath = path.resolve('.cache');
const hashFormat = '[contenthash:8]';
const baseCharset = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.0123456789';
const imageminPlugins = [mozjpeg(), optipng()];
const context = path.resolve(__dirname, '../lib');
const outputPath = 'assets';
const bdfLoader = { loader: 'bdf2fnt-loader', options: { outputPath } };
const decryptionLoader = { loader: 'decryption-loader', options: { password: process.env.DECRYPTION_PASSWORD } };
const fileLoader = {
  loader: 'file-loader',
  options: {
    outputPath,
    name(resource) {
      const original = path.basename(resource, '.enc');
      const ext = path.extname(original);
      return `${path.basename(original, ext)}.${hashFormat}${ext}`;
    },
  },
};
const options = {
  context,
  mode: 'production',
  entry: './main.js',
  output: { filename: '[name].[contenthash:8].js', path: context, publicPath: hexo.config.root },
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
      { test: /\.bdf.enc$/, use: [bdfLoader, decryptionLoader] },
      {
        test: /\.png.enc$/,
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

let compiler;
let content;
let entrypoints;
let dev;

function buildCompiler() {
  compiler = webpack(options);
  compiler.outputFileSystem = createFsFromVolume(new Volume());
  compiler.hooks.infrastructureLog.tap('cruzdanilo', (name, level, args) => args
    .forEach((arg) => arg.split('\n')
      .forEach((l) => hexo.log[level](`[${{ 'webpack-dev-middleware': 'wdm' }[name] || name}]`, l))));
}

hexo.extend.generator.register('asset', async (locals) => {
  const assets = (await Promise.all(hexo.model('PostAsset').map(async (asset) => {
    if (!await exists(asset.source)) {
      asset.remove();
      return [];
    }
    const source = path.resolve(cachePath, asset.path);
    let data;
    if (asset.modified || !await exists(source)) {
      const buffer = await readFile(asset.source, { encoding: null, escape: false });
      data = await imagemin(buffer, { plugins: imageminPlugins });
      hexo.log.info('[imagemin]', filesize(buffer.length).padStart(9), '=>',
        filesize(data.length).padStart(9),
        cyan(`-${(1 - (data.length / buffer.length))
          .toLocaleString(undefined, { style: 'percent' })}`.padStart(4)),
        magenta(asset.path));
      await writeFile(source, data);
    } else data = await readFile(source, { encoding: null, escape: false });
    const { dir, name, ext } = path.parse(asset.path);
    return {
      path: path.join(dir, interpolateName({}, `${name}.${hashFormat}${ext}`, { content: data })),
      data: () => createReadStream(source),
    };
  }))).flat();
  content = beautify(stringify({
    posts: locals.posts.sort('-date').map((post) => ({
      path: urlFor(post.path), cover: post.cover, photos: post.photos,
    })),
  }), { indent_size: 2 }).trim();
  const charset = [...locals.posts.reduce((set, post) => {
    Array.from(post.title + stripHTML(post.content)).forEach((c) => set.add(c));
    return set;
  }, new Set(baseCharset))].filter((ch) => /[ \S]/.test(ch)).sort().join('');

  if (!compiler) buildCompiler();
  const revision = interpolateName({}, hashFormat, { content: new Date().toISOString() });
  Object.assign(compiler.options.plugins.find((p) => p instanceof InjectManifest).config, {
    additionalManifestEntries: [
      { url: path.resolve(hexo.config.root, 'index.html'), revision },
      ...assets.map((asset) => ({ url: urlFor(asset.path), revision: null })),
    ],
  });
  const stats = await new Promise((resolve, reject) => {
    if (dev) {
      if (charset !== bdfLoader.options.charset) {
        bdfLoader.options.charset = charset;
        dev.invalidate(resolve);
      } else dev.waitUntilValid(resolve);
    } else {
      compiler.run((error, result) => {
        if (error) return reject(error);
        const log = hexo.log[result.hasErrors() ? 'error' : 'info'].bind(hexo.log);
        result.toString(compiler.options.stats).split('\n').forEach((l) => log('[webpack]', l));
        return resolve(result);
      });
    }
  });
  if (stats.hasErrors()) throw new Error(stats.errors);
  entrypoints = [...stats.compilation.entrypoints.values()]
    .flatMap((e) => e.chunks.map(({ files: [f] }) => f)).map(urlFor);
  return [
    ...assets,
    ...Object.keys(stats.compilation.assets).map((f) => ({
      path: f,
      data: () => compiler.outputFileSystem.createReadStream(path.resolve(compiler.outputPath, f)),
    })),
  ];
});

hexo.extend.filter.register('template_locals', (l) => Object.assign(l, { content, entrypoints }));

hexo.extend.filter.register('server_middleware', (app) => {
  options.mode = 'development';
  options.devtool = 'eval-source-map';
  options.output.filename = '[name].js';
  options.entry = [options.entry, './hmrClient'];
  options.plugins.push(new HotModuleReplacementPlugin());
  options.plugins.find((plugin) => plugin instanceof InjectManifest).config.exclude = [/.*/];
  buildCompiler();
  dev = webpackDevMiddleware(compiler);
  app.use(dev);
  const hot = webpackHotMiddleware(compiler, {
    path: '/webpack.hmr',
    log: (...args) => args.forEach((a) => a.split('\n').forEach((l) => hexo.log.info('[whm]', l))),
  });
  app.use(hot);
  const hashes = new Map();
  hexo.on('generateAfter', async () => {
    const reload = (await Promise.all(hexo.route.list()
      .filter((route) => !dev.context.stats.compilation.assets[route])
      .filter((route) => hexo.route.isModified(route))
      .map(async (route) => {
        const newHash = await new Promise((resolve, reject) => {
          const hsh = createHash('md4');
          hexo.route.get(route).pipe(hsh)
            .on('error', reject)
            .on('finish', () => resolve(hsh.read().toString('hex')));
        });
        const lastHash = hashes.get(route);
        hashes.set(route, newHash);
        return !!lastHash && lastHash !== newHash;
      }))).find(Boolean);
    if (reload) hot.publish({ action: 'reload' });
  });
});
