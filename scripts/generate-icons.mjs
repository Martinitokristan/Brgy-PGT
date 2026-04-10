/**
 * Generates all required PWA icon sizes.
 * If public/icon.png exists, it resizes that.
 * Otherwise generates a branded blue icon with "PGT" text.
 * Output: public/icons/icon-{size}.png
 *
 * Run: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcIcon = path.join(__dirname, "../public/icon.png");
const outDir = path.join(__dirname, "../public/icons");

fs.mkdirSync(outDir, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Branded SVG icon — blue background, white "PGT" text + shield shape
function makeSvg(size) {
  const pad = Math.round(size * 0.12);
  const r = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.22);
  const shieldSize = Math.round(size * 0.38);
  const shieldY = Math.round(size * 0.13);
  const textY = Math.round(size * 0.72);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#1e40af"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.5"/>
    </linearGradient>
  </defs>
  <text x="${size / 2}" y="${Math.round(size * 0.47)}" font-family="Arial,sans-serif" font-weight="900"
    font-size="${Math.round(size * 0.28)}" fill="white" text-anchor="middle" dominant-baseline="middle">PGT</text>
  <text x="${size / 2}" y="${Math.round(size * 0.72)}" font-family="Arial,sans-serif" font-weight="600"
    font-size="${Math.round(size * 0.1)}" fill="rgba(255,255,255,0.75)" text-anchor="middle">BARANGAY</text>
</svg>`;
}

const useExisting = fs.existsSync(srcIcon);
console.log(useExisting ? "Using public/icon.png as source." : "No icon.png found — generating branded icon.");

for (const size of SIZES) {
  const dest = path.join(outDir, `icon-${size}.png`);
  if (useExisting) {
    await sharp(srcIcon)
      .resize(size, size, { fit: "contain", background: { r: 30, g: 64, b: 175, alpha: 1 } })
      .png()
      .toFile(dest);
  } else {
    await sharp(Buffer.from(makeSvg(size)))
      .resize(size, size)
      .png()
      .toFile(dest);
  }
  console.log(`Generated icon-${size}.png`);
}

console.log("\nAll icons generated in public/icons/");
const screenshotsDir = path.join(__dirname, "../public/screenshots");
fs.mkdirSync(screenshotsDir, { recursive: true });
console.log("Created public/screenshots/ — add a home.png (390x844) for Play Store listing.");
