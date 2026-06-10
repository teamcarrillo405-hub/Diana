// Convert the Blender frame sequence to WebP for the scroll film.
// PNGs stay local (gitignored); only the WebPs ship.
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const dir = join(process.cwd(), "public", "landing-3d");
const pngs = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();

let total = 0;
for (const png of pngs) {
  const out = join(dir, png.replace(".png", ".webp"));
  await sharp(join(dir, png)).webp({ quality: 72 }).toFile(out);
  total += statSync(out).size;
}
console.log(`converted ${pngs.length} frames, webp total: ${(total / 1024 / 1024).toFixed(1)} MB`);

// remove PNGs so they never get committed
for (const png of pngs) unlinkSync(join(dir, png));
console.log("pngs removed");
