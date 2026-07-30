/**
 * Generate PNG icons from icon.svg using @resvg/resvg-js
 * Run: node scripts/generate-icons.mjs
 */
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgBuffer = readFileSync(resolve(root, "public/icons/icon.svg"));

const sizes = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 512, name: "icon-maskable-512.png" },
];

for (const { size, name } of sizes) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: { mode: "width", value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  writeFileSync(resolve(root, "public/icons", name), pngBuffer);
  console.log(`Generated ${name} (${size}×${size})`);
}

console.log("Icons generated.");
