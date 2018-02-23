/* eslint-env node */
/* global hexo */
const {
  Compiler,
  NodeEnvironmentPlugin,
  WebpackOptionsApply,
  WebpackOptionsDefaulter,
} = require('webpack');
const path = require('path');
const MemoryFileSystem = require('memory-fs');

let watching;
let routes;
const resolves = [];

function webpack() {
  const context = path.resolve(__dirname, '../lib/');
  const options = new WebpackOptionsDefaulter().process({
    context,
    entry: './main.js',
    mode: 'production',
    output: { filename: '[name].js', path: context },
    performance: { maxAssetSize: 600000, maxEntrypointSize: 600000 },
    module: {
      rules: [
        {
          test: /cocos2d-html5\//,
          use: {
            loader: 'cocos2d-loader',
            options: {
              modules: ['base4webgl', 'actions', 'render-texture', 'labels'],
            },
          },
        },
        {
          test: /\.png$/,
          use: {
            loader: 'file-loader',
            options: {
              outputPath: 'assets/',
            },
          },
        },
        {
          test: /\.bdf$/,
          use: {
            loader: 'bdf2fnt-loader',
            options: {
              outputPath: 'assets/',
            },
          },
        },
      ],
    },
    node: { fs: 'empty' },
  });
  const compiler = new Compiler(context);
  new NodeEnvironmentPlugin().apply(compiler);
  compiler.outputFileSystem = new MemoryFileSystem();
  compiler.options = new WebpackOptionsApply().process(options, compiler);
  compiler.hooks.emit.tapAsync('cruzdanilo', (compilation, callback) => {
    routes = Object.entries(compilation.assets).map(([k, v]) => ({
      path: k,
      data: v.source(),
    }));
    resolves.forEach(resolve => resolve(routes));
    resolves.length = 0;
    callback();
  });
  watching = compiler.watch(null, (err, stats) => {
    if (err) throw err;
    stats.toString({ colors: true }).split('\n').forEach(l => hexo.log.info(`webpack: ${l}`));
    if (!hexo.theme.isWatching()) return;
    hexo.theme.watcher.emit('change', path.join(context, compiler.options.entry));
  });
  hexo.on('exit', () => {
    if (!hexo.theme.isWatching()) watching.close();
  });
}

hexo.extend.generator.register('cruzdanilo', () => {
  if (watching.running) return new Promise(r => resolves.push(r));
  return routes;
});

hexo.on('generateBefore', () => {
  if (!watching) webpack();
});

hexo.extend.helper.register('cover', function cover(item) {
  const asset = hexo.model('PostAsset').findOne({
    post: item._id, // eslint-disable-line no-underscore-dangle
    slug: item.cover_image,
  });
  return asset ? this.url_for(asset.path) : null;
});
