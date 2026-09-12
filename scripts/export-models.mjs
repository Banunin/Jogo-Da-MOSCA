import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import ts from "typescript";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
// Node-side adapter needed by the Three.js binary exporter.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(b=>{ this.result=b; this.onloadend?.(); }); }
};
const source = await readFile(new URL("../src/game/art-models.ts",import.meta.url),"utf8");
const temp=new URL("./.art-export.mjs",import.meta.url);
await writeFile(temp,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const {modelFactories}=await import(temp.href);
const dir=new URL("../public/assets/models/",import.meta.url);
await mkdir(dir,{recursive:true});
for(const [name,make] of Object.entries(modelFactories)){
  const root=make();
  const data=await new GLTFExporter().parseAsync(root,{binary:true});
  await writeFile(new URL(name+".glb",dir),Buffer.from(data));
  console.log(name, data.byteLength);
}
await unlink(temp);
