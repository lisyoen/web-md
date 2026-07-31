'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectDir = path.resolve(__dirname, '..');
const manifest = require('../extension/manifest.json');
const sizes = [16, 48, 128];

async function run() {
  const iconPaths = sizes.map((size) =>
    path.join(projectDir, 'extension', 'icons', `icon${size}.png`)
  );

  for (const iconPath of iconPaths) {
    assert.strictEqual(fs.existsSync(iconPath), true, `${iconPath} is missing`);
  }
  console.log('PASS all 3 icon PNG files exist');

  for (const [index, iconPath] of iconPaths.entries()) {
    const size = sizes[index];
    const metadata = await sharp(iconPath).metadata();
    assert.deepStrictEqual(
      [metadata.width, metadata.height],
      [size, size],
      `${path.basename(iconPath)} dimensions`
    );
  }
  console.log('PASS icon PNG dimensions are 16x16, 48x48, and 128x128');

  const { data, info } = await sharp(iconPaths[2]).removeAlpha().raw().toBuffer({
    resolveWithObject: true
  });
  const centerOffset = (64 * info.width + 64) * info.channels;
  const [red, green, blue] = data.subarray(centerOffset, centerOffset + 3);
  assert.ok(red >= 150, `center red channel is ${red}`);
  assert.ok(
    red - Math.max(green, blue) >= 60,
    `center RGB is ${red},${green},${blue}`
  );
  console.log(`PASS icon128 center is red (${red},${green},${blue})`);

  for (const size of sizes) {
    const expectedPath = `icons/icon${size}.png`;
    assert.strictEqual(manifest.icons[String(size)], expectedPath);
    assert.strictEqual(manifest.action.default_icon[String(size)], expectedPath);
    assert.strictEqual(
      fs.existsSync(path.join(projectDir, 'extension', expectedPath)),
      true
    );
  }
  console.log('PASS manifest icon paths match existing files');

  assert.strictEqual(manifest.version, '1.2.0');
  console.log('PASS icon manifest version is 1.2.0');
  console.log('PASS all 5 icon checks');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
