require('dotenv').config();
const { createHash } = require('crypto');
const { js: beautify } = require('js-beautify');
const { cyan, magenta } = require('chalk');
const { interpolateName } = require('loader-utils');
const { parse, stringify } = require('json5');
const { Volume, createFsFromVolume } = require('memfs');
const { stripHTML, url_for: unboundUrlFor } = require('hexo-util');
const { webpack, DefinePlugin, HotModuleReplacementPlugin } = require('webpack');
const { InjectManifest } = require('workbox-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { default: webpackDevMiddleware } = require('webpack-dev-middleware');
const TerserPlugin = require('terser-webpack-plugin');
const webpackHotMiddleware = require('webpack-hot-middleware');
const filesize = require('filesize');
const optipng = require('imagemin-optipng')();
const sharp = require('sharp');
const path = require('path');
const {
  createReadStream, exists, readFile, writeFile,
} = require('hexo-fs');

const urlFor = unboundUrlFor.bind(hexo);
const cachePath = '.cache';
const hashFormat = '[contenthash:8]';
let revision = interpolateName({}, hashFormat, { content: new Date().toISOString() });
let compiler;
let server;
let wdm;
let bdfLoader;
let content;
let entrypoints;

const buildCompiler = (dev = !!server) => {
  const context = path.resolve(__dirname, '../lib');
  const outputPath = '_assets';
  bdfLoader = { loader: 'bdf2fnt-loader', options: { outputPath } };
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
  const optimizeLoader = { loader: require.resolve('./optimize-loader'), options: fileLoader.options };
  const decryptionLoader = { loader: 'decryption-loader', options: { password: process.env.DECRYPTION_PASSWORD } };
  compiler = webpack({
    context,
    mode: dev ? 'development' : 'production',
    devtool: dev && 'eval-source-map',
    entry: ['./main.js', ...dev ? ['./hmrClient'] : []],
    output: {
      filename: dev ? '[name].js' : '[name].[contenthash:8].js',
      path: context,
      publicPath: hexo.config.root,
    },
    infrastructureLogging: { level: 'none' },
    stats: { colors: true, ...!dev && { maxModules: Infinity } },
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
          }, { use: [optimizeLoader, decryptionLoader] }],
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
        ...dev && { exclude: [/.*/] },
      }),
      ...dev ? [new HotModuleReplacementPlugin()] : [],
    ],
    ...process.env.DEBUG && {
      resolve: { symlinks: false },
      cache: { type: 'memory', managedPaths: [] },
    },
  });
  compiler.outputFileSystem = createFsFromVolume(new Volume());
  compiler.hooks.infrastructureLog.tap('cruzdanilo', (name, level, args) => args
    .forEach((arg) => arg.split('\n')
      .forEach((l) => hexo.log[level](`[${{ 'webpack-dev-middleware': 'wdm' }[name] || name}]`, l))));
  if (!server) return;
  wdm = webpackDevMiddleware(compiler);
  const hot = webpackHotMiddleware(compiler, {
    path: '/webpack.hmr',
    log: (...args) => args.forEach((a) => a.split('\n').forEach((l) => hexo.log.info('[whm]', l))),
  });
  server.use(hot);
  const hashes = new Map();
  hexo.on('generateAfter', async () => {
    const modified = (await Promise.all(hexo.route.list()
      .filter((route) => !wdm.context.stats.compilation.assets[route])
      .filter((route) => hexo.route.isModified(route))
      .map(async (route) => {
        const hash = await new Promise((resolve, reject) => {
          const hasher = createHash('md4');
          hexo.route.get(route).pipe(hasher)
            .on('error', reject)
            .on('finish', () => resolve(hasher.read().toString('hex')));
        });
        const lastHash = hashes.get(route);
        hashes.set(route, hash);
        return !!lastHash && lastHash !== hash && route;
      }))).filter((route) => route);
    if (modified.length) hot.publish({ action: 'reload' });
    if (modified.includes('index.html')) {
      revision = interpolateName({}, hashFormat, { content: new Date().toISOString() });
      wdm.invalidate();
      hexo._generate();
    }
  });
};

hexo.model('PostAsset').schema.virtual('path').get(function () {
  return path.join(hexo.model('Post').findById(this.post).path, this.optslug || this.slug);
});
hexo.extend.filter.register('server_middleware', (app) => { server = app; });
hexo.extend.filter.register('template_locals', (l) => Object.assign(l, { content, entrypoints }));
hexo.extend.generator.register('asset', async (locals) => {
  const Post = hexo.model('Post');
  const Cache = hexo.model('Cache');
  const PostAsset = hexo.model('PostAsset');
  const route = (p, s, m) => ({ path: p, data: { modified: m, data: () => createReadStream(s) } });
  const assets = (await Promise.all([
    ...PostAsset.toArray(), ...hexo.model('Asset').toArray(),
  ].map(async (asset) => {
    if (!await exists(asset.source)) { asset.remove(); return []; }
    const original = asset.original || asset.path;
    const { dir, name, ext } = path.parse(original);
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) return route(original, asset.source, asset.modified);
    const { hash } = Cache.findById(asset._id);
    const sourceMeta = path.join(cachePath, `${original}.json5`);
    let output;
    let modified = false;
    try {
      const meta = parse(await readFile(sourceMeta));
      if (hash !== meta.hash) throw new Error('invalid cache');
      output = meta.output;
    } catch {
      const buffer = await readFile(asset.source, { encoding: null, escape: false });
      output = Object.fromEntries(await Promise.all([
        ['optslug', `.${hashFormat}.jpg`, (b) => b, sharp(buffer)
          .resize({ width: 1600, withoutEnlargement: true })
          .jpeg({
            quality: 75,
            trellisQuantization: true,
            overshootDeringing: true,
            optimizeScans: true,
            quantizationTable: 3,
          })],
        ['webp', `.${hashFormat}.webp`, (b) => b, sharp(buffer)
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 75, reductionEffort: 6, smartSubsample: true })],
        ...asset.post && Post.findById(asset.post).cover === asset.slug ? [
          ['cover', `.cover.${hashFormat}.png`, optipng, sharp(buffer)
            .resize(hexo.config.cover)
            .png({ compressionLevel: 0 })],
          ['coverwebp', `.cover.${hashFormat}.webp`, (b) => b, sharp(buffer)
            .resize(hexo.config.cover)
            .webp({ quality: 75, reductionEffort: 6, smartSubsample: true })],
        ] : [],
      ].map(async ([key, suffix, optimizer, pipeline]) => {
        modified = true;
        const data = await optimizer(await pipeline.toBuffer());
        const optname = interpolateName({}, `${name}${suffix}`, { content: data });
        const optpath = path.join(dir, optname);
        hexo.log.info('[optimize]', filesize(buffer.length).padStart(9), '=>',
          filesize(data.length).padStart(9),
          cyan(`-${(1 - (data.length / buffer.length))
            .toLocaleString(undefined, { style: 'percent' })}`.padStart(5)),
          magenta(optpath));
        await writeFile(path.join(cachePath, optpath), data);
        return [key, optname];
      })));
      await writeFile(sourceMeta, stringify({ hash, output }, null, 2));
    }
    await asset.update({ original, ...output, ...!asset.post && { path: output.optslug } });
    return Object.values(output)
      .map((slug) => route(path.join(dir, slug), path.join(cachePath, dir, slug), modified));
  }))).flat();

  if (!compiler) buildCompiler();
  Object.assign(compiler.options.plugins.find((p) => p instanceof InjectManifest).config, {
    additionalManifestEntries: [
      { url: path.resolve(hexo.config.root, 'index.html'), revision },
      ...assets.map((asset) => ({ url: urlFor(asset.path), revision: null })),
    ],
  });
  const charset = [...locals.posts.reduce((set, post) => {
    Array.from(post.title + stripHTML(post.content)).forEach((c) => set.add(c));
    return set;
  }, new Set(' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.0123456789'))]
    .filter((ch) => /[ \S]/.test(ch)).sort().join('');
  const stats = await new Promise((resolve, reject) => {
    if (wdm) {
      if (charset !== bdfLoader.options.charset) {
        bdfLoader.options.charset = charset;
        wdm.invalidate(resolve);
      } else wdm.waitUntilValid(resolve);
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

  content = beautify(stringify({
    posts: locals.posts.sort('-date').map((post) => {
      const { cover, coverwebp } = PostAsset.findOne({ post: post._id, slug: post.cover });
      return {
        path: urlFor(post.path),
        cover: [cover, coverwebp],
        photos: post.photos.map((slug) => {
          const { optslug, webp } = PostAsset.findOne({ post: post._id, slug });
          return [optslug, webp];
        }),
      };
    }),
  }), { indent_size: 2 }).trim();
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
