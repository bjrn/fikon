const imagemin = require('imagemin');
const mozjpeg = require('imagemin-mozjpeg');
const imageminSvgo = require('imagemin-svgo');
const imageminPngquant = require('imagemin-pngquant');
const path = require('path');

async function minify(dir) {
  const files = await imagemin(
    [
      // these are the supported export formats in Figma
      `${dir}/*.{svg,png,jpg}`,
    ],
    {
      destination: dir,
      plugins: [
        imageminPngquant(),
        imageminSvgo(),
        // imageminJpegtran(),
        mozjpeg({ quality: 84 }),
      ],
    }
  );
  return files;
}

module.exports = minify;
