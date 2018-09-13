/* eslint-env node */
/* global hexo */
const path = require('path');
const MemoryFS = require('memory-fs');
const TexturePackerPlugin = require('texture-packer-webpack-plugin');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

const context = path.resolve(__dirname, '../lib');
const outputPath = 'assets';
const texturepacker = new TexturePackerPlugin({ outputPath });
const options = {
  context,
  entry: './main.js',
  output: { filename: '[name].js', path: context },
  mode: 'production',
  performance: { maxAssetSize: 1024 * 1024, maxEntrypointSize: 1024 * 1024 },
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
      { test: /\.png$/, use: TexturePackerPlugin.loader({ outputPath }) },
      { test: /\.bdf$/, use: { loader: 'bdf2fnt-loader', options: { outputPath } } },
    ],
  },
  plugins: [texturepacker],
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
function buildCompiler() {
  compiler = webpack(options);
  compiler.outputFileSystem = new MemoryFS();
}

let middleware;
hexo.extend.filter.register('server_middleware', (app) => {
  options.mode = 'development';
  options.devtool = 'source-map';
  options.entry = [options.entry, 'webpack-hot-middleware/client?path=/webpack.hmr&reload=true'];
  options.plugins.push(new webpack.HotModuleReplacementPlugin());
  buildCompiler();
  middleware = webpackDevMiddleware(compiler, {
    publicPath: compiler.options.output.publicPath,
    logger: hexo.log,
    stats: options.stats,
  });
  app.use(middleware);
  app.use(webpackHotMiddleware(compiler, {
    path: '/webpack.hmr',
    log: hexo.log.info.bind(hexo.log),
  }));
});

hexo.extend.generator.register('cruzdanilo', () => new Promise((resolve) => {
  function handle(stats) {
    resolve(stats.hasErrors() ? null : Object.entries(stats.compilation.assets).map(([k, v]) => ({
      path: k,
      data: v.source(),
    })));
  }
  if (middleware) {
    middleware.waitUntilValid((stats) => {
      hexo.theme.emit('processAfter');
      handle(stats);
    });
  } else {
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
const articles = [];
Array.from(document.getElementsByTagName('article')).forEach((e) => {
  articles.push(e);
  e.style.display = 'none';
});
const atlas = ${JSON.stringify(texturepacker.output, null, 2)};
  </script>
  ${this.js('main.js')}\n`;
});

hexo.extend.helper.register('cover', function cover(item) {
  const asset = hexo.model('PostAsset').findOne({
    post: item._id, // eslint-disable-line no-underscore-dangle
    slug: item.cover_image,
  });
  return asset ? this.url_for(asset.path) : null;
});
