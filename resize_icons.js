const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const iconsDir = path.join(publicDir, 'icons');
const sourceFile = path.join(publicDir, 'logo.svg');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

async function generateIcons() {
  try {
    // Generate 192x192
    await sharp(sourceFile)
      .resize(192, 192)
      .toFile(path.join(iconsDir, 'icon-192.png'));
    console.log('Created icon-192.png');

    // Generate 512x512
    await sharp(sourceFile)
      .resize(512, 512)
      .toFile(path.join(iconsDir, 'icon-512.png'));
    console.log('Created icon-512.png');

    // Generate apple-touch-icon (180x180)
    await sharp(sourceFile)
      .resize(180, 180)
      .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
    console.log('Created apple-touch-icon.png');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
