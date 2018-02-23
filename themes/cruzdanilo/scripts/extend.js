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

function webpack() {
  const context = path.resolve(__dirname, '../source/');
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
      ],
    },
    node: { fs: 'empty' },
  });
  const compiler = new Compiler(context);
  new NodeEnvironmentPlugin().apply(compiler);
  const fs = new MemoryFileSystem();
  compiler.outputFileSystem = fs;
  compiler.options = new WebpackOptionsApply().process(options, compiler);
  watching = compiler.watch(null, (err, stats) => {
    stats.toString({ colors: true }).split('\n').forEach(l => hexo.log.info(`webpack: ${l}`));
    if (!hexo.theme.isWatching()) return;
    hexo.theme.watcher.emit('change', path.join(context, compiler.options.entry));
  });
  hexo.on('exit', () => {
    if (!hexo.theme.isWatching()) watching.close();
  });
  hexo.extend.renderer.register('js', 'js', (data, opts, cb) => {
    if (watching.running) {
      watching.callbacks.push(() => cb(null, fs.readFileSync(data.path).toString()));
    } else cb(null, fs.readFileSync(data.path).toString());
  });
}

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
