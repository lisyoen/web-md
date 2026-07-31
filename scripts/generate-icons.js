'use strict';

const path = require('path');
const sharp = require('sharp');

const projectDir = path.resolve(__dirname, '..');
const source = path.join(projectDir, 'assets', 'icon.svg');
const outputDir = path.join(projectDir, 'extension', 'icons');
const sizes = [16, 48, 128];

async function generateIcons() {
  for (const size of sizes) {
    const output = path.join(outputDir, `icon${size}.png`);
    await sharp(source)
      .resize(size, size)
      .png()
      .toFile(output);
    console.log(`Generated ${path.relative(projectDir, output)} (${size}x${size})`);
  }
}

generateIcons()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
