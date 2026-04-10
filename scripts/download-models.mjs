import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/models");
const srcDir = path.join(__dirname, "../node_modules/@vladmandic/face-api/model");
fs.mkdirSync(outDir, { recursive: true });

// Copy only the 4 models the app uses — sourced directly from the installed
// npm package so the weights always match the installed library version.
const FILES = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model.bin",
  "face_landmark_68_tiny_model-weights_manifest.json",
  "face_landmark_68_tiny_model.bin",
  "face_expression_model-weights_manifest.json",
  "face_expression_model.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model.bin",
];

for (const f of FILES) {
  const src = path.join(srcDir, f);
  const dest = path.join(outDir, f);
  if (!fs.existsSync(src)) {
    console.log(`MISSING in node_modules: ${f}`);
    continue;
  }
  fs.copyFileSync(src, dest);
  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`Copied ${f} (${kb}KB)`);
}
console.log("\nDone. Models in public/models/");
