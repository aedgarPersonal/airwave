import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const src = await readFile(resolve(root, "public/icon.svg"));

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  const buf = await sharp(src, { density: 512 }).resize(size, size).png().toBuffer();
  await writeFile(resolve(root, "public", name), buf);
  console.log(`wrote public/${name} (${buf.length} bytes)`);
}
