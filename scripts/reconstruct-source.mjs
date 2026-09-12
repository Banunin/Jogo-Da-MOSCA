import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packDir = path.join(root, "source-pack");

const targets = [
  { output: "src/game/models.ts", parts: ["src__game__models_ts.gz.part00"], encoding: "binary" },
  {
    output: "src/game/simulation.ts",
    parts: ["src__game__simulation_ts.gz.part00", "src__game__simulation_ts.gz.part01", "src__game__simulation_ts.gz.part02a", "src__game__simulation_ts.gz.part02b"],
    encoding: "binary",
  },
  {
    output: "src/game/world.ts",
    parts: [
      "src__game__world_ts.b64.part00a", "src__game__world_ts.b64.part00b", "src__game__world_ts.b64.part00c",
      "src__game__world_ts.b64.part00d", "src__game__world_ts.b64.part00e", "src__game__world_ts.b64.part00f",
      "src__game__world_ts.b64.part00g", "src__game__world_ts.b64.part01", "src__game__world_ts.b64.part02",
      "src__game__world_ts.b64.part03", "src__game__world_ts.b64.part04",
    ],
    encoding: "base64",
  },
  {
    output: "src/styles.css",
    parts: ["src__styles_css.b64.part00", "src__styles_css.b64.part01", "src__styles_css.b64.part02"],
    encoding: "base64",
  },
];

for (const target of targets) {
  let packed;
  if (target.encoding === "binary") {
    const chunks = await Promise.all(target.parts.map((name) => readFile(path.join(packDir, name))));
    packed = Buffer.concat(chunks);
  } else {
    const chunks = await Promise.all(target.parts.map((name) => readFile(path.join(packDir, name), "utf8")));
    packed = Buffer.from(chunks.join(""), "base64");
  }
  let source = gunzipSync(packed).toString("utf8");

  // Compatibilidade entre a simulação empacotada e a camada P2P atual.
  if (target.output === "src/game/simulation.ts") {
    source = source.replaceAll("multiplayerClient.sendPose(pose)", "multiplayerClient.updatePose(0.055, pose)");
  }

  const outputPath = path.join(root, target.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source);
  console.log(`[MUSCA] fonte reconstruída: ${target.output}`);
}

// store.ts é versionado diretamente. A política de saves da beta não pode ser
// sobrescrita por um pacote antigo durante predev/prebuild/precheck.
const storePath = path.join(root, "src/game/store.ts");
await access(storePath);
let storeSource = await readFile(storePath, "utf8");

// Mantém as abas históricas do laboratório tipadas de forma consistente com a UI.
const oldLabType = '  labTab: "brain" | "sensors" | "memory" | "profiles" | "settings";';
const newLabType = '  labTab: LabTab;';
if (!storeSource.includes("export type LabTab")) {
  storeSource = storeSource.replace(
    "export interface GameUIState {",
    'export type LabTab = "brain" | "tasks" | "memory" | "sensors" | "profiles" | "upgrades" | "settings";\n\nexport interface GameUIState {'
  );
}
storeSource = storeSource.replace(oldLabType, newLabType);
await writeFile(storePath, storeSource);
console.log("[MUSCA] fonte versionada mantida: src/game/store.ts");
