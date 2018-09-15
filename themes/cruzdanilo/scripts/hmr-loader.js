/* eslint-env node */
/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
const qs = require('querystring');
const loaderUtils = require('loader-utils');
const { RawSource, OriginalSource, ConcatSource } = require('webpack-sources');

module.exports = function loader(content) {
  const sourcePath = loaderUtils.getRemainingRequest(this);
  const concat = new ConcatSource(new OriginalSource(`${content}\n`, sourcePath));
  const options = loaderUtils.getOptions(this) || {};
  concat.add(new RawSource(`
(async () => {
  const { subscribe } = await import('webpack-hot-middleware/client?${qs.stringify(options)}');
  subscribe(() => window.location.reload());
})();
`));
  const result = concat.sourceAndMap();
  this.callback(null, result.source, result.map);
};
