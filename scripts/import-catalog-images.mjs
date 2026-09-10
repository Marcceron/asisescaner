import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Converts generated originals to web-sized thumbnails without cropping.
const entries = JSON.parse(process.argv[2]);
const target = path.resolve("public/assets/catalog");
await mkdir(target, { recursive: true });
for (const { id, source } of entries) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid image id");
  const output = path.join(target, id + ".webp");
  let exists = false;
  try { await access(output); exists = true; } catch {}
  if (exists) throw new Error("Refusing to overwrite: " + output);
  await sharp(source).resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toFile(output);
  console.log(output);
}
