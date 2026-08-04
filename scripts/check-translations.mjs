/**
 * Fail if he/en message namespaces diverge in key structure.
 * Usage: node scripts/check-translations.mjs
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const root = join(process.cwd(), "messages");
const heDir = join(root, "he");
const enDir = join(root, "en");

function flatten(obj, prefix = "") {
  /** @type {string[]} */
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const heFiles = new Set(readdirSync(heDir).filter((f) => f.endsWith(".json")));
const enFiles = new Set(readdirSync(enDir).filter((f) => f.endsWith(".json")));

let failed = false;

for (const f of heFiles) {
  if (!enFiles.has(f)) {
    console.error(`Missing en/${f}`);
    failed = true;
  }
}
for (const f of enFiles) {
  if (!heFiles.has(f)) {
    console.error(`Missing he/${f}`);
    failed = true;
  }
}

for (const f of heFiles) {
  if (!enFiles.has(f)) continue;
  const heKeys = new Set(flatten(JSON.parse(readFileSync(join(heDir, f), "utf8"))));
  const enKeys = new Set(flatten(JSON.parse(readFileSync(join(enDir, f), "utf8"))));
  for (const k of heKeys) {
    if (!enKeys.has(k)) {
      console.error(`Missing in en/${f}: ${k}`);
      failed = true;
    }
  }
  for (const k of enKeys) {
    if (!heKeys.has(k)) {
      console.error(`Missing in he/${f}: ${k}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log("Translation key parity OK");
