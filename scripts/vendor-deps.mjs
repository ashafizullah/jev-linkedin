import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const files = [
  ["node_modules/pdfjs-dist/build/pdf.min.mjs", "vendor/pdfjs/pdf.min.mjs"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "vendor/pdfjs/pdf.worker.min.mjs"],
  ["node_modules/pdfjs-dist/LICENSE", "vendor/pdfjs/LICENSE"],
  ["node_modules/mammoth/mammoth.browser.min.js", "vendor/mammoth/mammoth.browser.min.js"],
  ["node_modules/mammoth/LICENSE", "vendor/mammoth/LICENSE"],
];

for (const [from, to] of files) {
  const target = join(root, to);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, from), target);
  console.log(`copied ${from} -> ${to}`);
}
