/* eslint-env node */
/* global hexo */
const path = require('path');
const MemoryFS = require('memory-fs');
const TexturePackerPlugin = require('texture-packer-webpack-plugin');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

const context = path.resolve(__dirname, '../lib/');
const outputPath = 'assets/';
const texturepacker = new TexturePackerPlugin({ outputPath });
const options = {
  context,
  entry: ['./main.js'],
  output: { filename: '[name].js', path: context },
  mode: 'production',
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
      { test: /\.png$/, use: TexturePackerPlugin.loader({ outputPath }) },
      { test: /\.bdf$/, use: { loader: 'bdf2fnt-loader', options: { outputPath } } },
    ],
  },
  plugins: [texturepacker],
  node: { fs: 'empty' },
};

let compiler;
function buildCompiler() {
  compiler = webpack(options);
  compiler.outputFileSystem = new MemoryFS();
}

let middleware;
hexo.extend.filter.register('server_middleware', (app) => {
  options.entry.push('webpack-hot-middleware/client');
  options.mode = 'development';
  options.devtool = 'source-map';
  buildCompiler();
  middleware = webpackDevMiddleware(compiler, { publicPath: compiler.options.output.publicPath });
  app.use(middleware);
});

hexo.extend.generator.register('cruzdanilo', () => new Promise((resolve) => {
  function toRoutes(compilation) {
    return Object.entries(compilation.assets).map(([k, v]) => ({
      path: k,
      data: v.source(),
    }));
  }
  if (middleware) {
    middleware.waitUntilValid(stats => resolve(toRoutes(stats.compilation)));
  } else {
    if (!compiler) buildCompiler();
    compiler.run((err, stats) => resolve(toRoutes(stats.compilation)));
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
