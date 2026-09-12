import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(root, "source-pack", "source-bundle.json.gz");
const allowed = new Set([
  "src/game/models.ts",
  "src/game/store.ts",
  "src/game/world.ts",
  "src/game/simulation.ts",
  "src/styles.css",
]);

const packed = await readFile(bundlePath);
const payload = JSON.parse(gunzipSync(packed).toString("utf8"));
if (payload?.version !== 1 || !payload.files) throw new Error("Pacote-fonte inválido.");

for (const [relativePath, source] of Object.entries(payload.files)) {
  if (!allowed.has(relativePath) || typeof source !== "string") {
    throw new Error(`Entrada inválida no pacote-fonte: ${relativePath}`);
  }
  const output = path.join(root, relativePath);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, source, "utf8");
  console.log(`[MUSCA] fonte reconstruída: ${relativePath}`);
}

for (const required of allowed) {
  if (!(required in payload.files)) throw new Error(`Fonte ausente no pacote: ${required}`);
}
