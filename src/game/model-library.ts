import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const models=new Map<string,THREE.Group>();
export async function loadModels() {
  const loader=new GLTFLoader();
  await Promise.all(["fly","spider","human","apple","banana","bread","fan","glass"].map(async name=>{
    const gltf=await loader.loadAsync(import.meta.env.BASE_URL+"assets/models/"+name+".glb");
    const root=gltf.scene.getObjectByName(name) as THREE.Group;
    if(!root)throw new Error("Modelo sem raiz: "+name);
    root.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}});
    models.set(name,root);
  }));
}
export function model(name:string):THREE.Group|null {
  return models.get(name)?.clone(true) ?? null;
}
