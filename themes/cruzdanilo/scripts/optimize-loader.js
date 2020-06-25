const { join } = require('path').posix;
const { getOptions, interpolateName } = require('loader-utils');
const optipng = require('imagemin-optipng')();
const sharp = require('sharp');

const done = new Map();

module.exports = async function loader(content) {
  this.async();
  const { name, outputPath } = getOptions(this) || {};
  const contenthash = interpolateName(this, '[contenthash]', { content });
  if (!done.has(contenthash)) {
    done.set(contenthash, await Promise.all([
      ['.png', optipng, sharp(content).png({ compressionLevel: 0 })],
      ['.webp', (b) => b, sharp(content).webp({ quality: 100, lossless: true, reductionEffort: 6 })],
    ].map(async ([ext, optimizer, pipeline]) => {
      const data = await optimizer(await pipeline.toBuffer());
      const filepath = join(outputPath, interpolateName({
        ...this, resourcePath: this.resourcePath.replace(/\.png(?!.*\.png)/, ext),
      }, name, { content: data }));
      this.emitFile(filepath, data);
      return filepath;
    })));
  }
  this.callback(null, `export default [${done.get(contenthash)
    .map((filepath) => `__webpack_public_path__ + ${JSON.stringify(filepath)}`).join(', ')}];`);
};

module.exports.raw = true;
