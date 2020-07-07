module.exports = {
  presets: [['@babel/env', { bugfixes: true, corejs: 3, useBuiltIns: 'usage' }]],
  plugins: ['@babel/syntax-top-level-await'],
  parserOpts: { allowAwaitOutsideFunction: true },
};
