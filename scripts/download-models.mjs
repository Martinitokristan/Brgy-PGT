import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/models");
fs.mkdirSync(outDir, { recursive: true });

const BASE = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const FILES = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_tiny_model-weights_manifest.json",
  "face_landmark_68_tiny_model-shard1",
  "face_expression_net-weights_manifest.json",
  "face_expression_net-shard1",
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

for (const f of FILES) {
  const dest = path.join(outDir, f);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
    console.log(`SKIP (exists): ${f}`);
    continue;
  }
  try {
    process.stdout.write(`Downloading ${f}... `);
    await download(`${BASE}/${f}`, dest);
    const kb = Math.round(fs.statSync(dest).size / 1024);
    console.log(`OK (${kb}KB)`);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }
}
console.log("\nDone. Models in public/models/");
