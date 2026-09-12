import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GameApp } from "@/components/musca/GameApp";
import { useGameStore } from "@/game/store";

const SAVE_KEY = "musca-studio-scene-patch-v1";
type ToolMode = "translate" | "rotate" | "scale";
type TransformState = { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; visible: boolean; name: string };
type StudioPatch = { version: 1; objects: Record<string, TransformState> };
type Runtime = { sim: any; scene: THREE.Scene; camera: THREE.Camera; renderer: THREE.WebGLRenderer; canvas: HTMLCanvasElement };

type SceneEntry = { object: THREE.Object3D; path: string; depth: number; label: string };

function findRuntime(): Runtime | null {
  const sim = (window as any).__muscaSim;
  const canvas = document.querySelector<HTMLCanvasElement>(".studio-root .game-canvas");
  if (!sim || !canvas) return null;
  const values = Object.values(sim) as unknown[];
  const scene = (sim.scene instanceof THREE.Scene ? sim.scene : values.find((value) => value instanceof THREE.Scene)) as THREE.Scene | undefined;
  const camera = (sim.camera instanceof THREE.Camera ? sim.camera : values.find((value) => value instanceof THREE.Camera)) as THREE.Camera | undefined;
  const renderer = (sim.renderer instanceof THREE.WebGLRenderer ? sim.renderer : values.find((value) => value instanceof THREE.WebGLRenderer)) as THREE.WebGLRenderer | undefined;
  if (!scene || !camera || !renderer) return null;
  return { sim, scene, camera, renderer, canvas };
}

function objectPath(object: THREE.Object3D, scene: THREE.Scene): string {
  const parts: number[] = [];
  let current: THREE.Object3D | null = object;
  while (current && current !== scene) {
    const parent: THREE.Object3D | null = current.parent;
    if (!parent) return "";
    parts.unshift(parent.children.indexOf(current));
    current = parent;
  }
  return parts.join(".");
}

function resolvePath(scene: THREE.Scene, path: string): THREE.Object3D | null {
  if (!path) return null;
  let current: THREE.Object3D = scene;
  for (const part of path.split(".")) {
    const index = Number(part);
    if (!Number.isInteger(index) || !current.children[index]) return null;
    current = current.children[index]!;
  }
  return current;
}

function serializeTransform(object: THREE.Object3D): TransformState {
  return {
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    scale: [object.scale.x, object.scale.y, object.scale.z],
    visible: object.visible,
    name: object.name,
  };
}

function applyTransform(object: THREE.Object3D, value: TransformState) {
  object.position.fromArray(value.position);
  object.rotation.set(...value.rotation);
  object.scale.fromArray(value.scale);
  object.visible = value.visible;
  if (value.name) object.name = value.name;
  object.updateMatrixWorld(true);
}

function sceneEntries(scene: THREE.Scene): SceneEntry[] {
  const rows: SceneEntry[] = [];
  const walk = (object: THREE.Object3D, depth: number) => {
    if ((object.userData as any).__muscaStudioHelper) return;
    const path = objectPath(object, scene);
    const suffix = object.uuid.slice(0, 5);
    rows.push({ object, path, depth, label: object.name.trim() || `${object.type} · ${suffix}` });
    if (depth < 5) object.children.forEach((child) => walk(child, depth + 1));
  };
  scene.children.forEach((child) => walk(child, 0));
  return rows.slice(0, 600);
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function numberValue(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
}

export function StudioApp() {
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [selected, setSelected] = useState<THREE.Object3D | null>(null);
  const [revision, setRevision] = useState(0);
  const [mode, setMode] = useState<ToolMode>("translate");
  const [playMode, setPlayMode] = useState(false);
  const [status, setStatus] = useState("Conectando ao mundo do jogo…");
  const [filter, setFilter] = useState("");
  const transformRef = useRef<TransformControls | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const editorCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const dirtyRef = useRef<Record<string, TransformState>>({});
  const playSnapshotRef = useRef<Record<string, TransformState>>({});
  const importRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let stopped = false;
    const timer = window.setInterval(() => {
      const found = findRuntime();
      if (!found || stopped) return;
      window.clearInterval(timer);
      setRuntime(found);
      setStatus("Mundo conectado · edição ao vivo");
    }, 100);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!runtime) return;
    const { scene, renderer, canvas, camera } = runtime;
    const editorCamera = new THREE.PerspectiveCamera(60, Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight), 0.01, 5000);
    editorCamera.position.copy(camera.position);
    if (editorCamera.position.lengthSq() < 0.01) editorCamera.position.set(12, 10, 16);
    editorCamera.quaternion.copy(camera.quaternion);
    editorCameraRef.current = editorCamera;

    const orbit = new OrbitControls(editorCamera, canvas);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.12;
    orbit.screenSpacePanning = true;
    orbit.target.set(0, 2, 0);
    orbit.update();
    orbitRef.current = orbit;

    const transform = new TransformControls(editorCamera, canvas);
    transform.setMode(mode);
    transform.setSize(0.8);
    const helper = ((transform as any).getHelper?.() ?? transform) as THREE.Object3D;
    helper.userData.__muscaStudioHelper = true;
    scene.add(helper);
    transformRef.current = transform;

    const grid = new THREE.GridHelper(80, 80, 0x64748b, 0x283344);
    grid.userData.__muscaStudioHelper = true;
    grid.position.y = 0.002;
    scene.add(grid);

    const onDragging = (event: any) => { orbit.enabled = !event.value && !playMode; };
    const onChanged = () => {
      const object = transform.object;
      if (!object) return;
      const path = objectPath(object, scene);
      if (path) dirtyRef.current[path] = serializeTransform(object);
      setRevision((value) => value + 1);
    };
    transform.addEventListener("dragging-changed", onDragging);
    transform.addEventListener("objectChange", onChanged);

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const patch = JSON.parse(raw) as StudioPatch;
        if (patch.version === 1) {
          dirtyRef.current = { ...patch.objects };
          Object.entries(patch.objects).forEach(([path, value]) => {
            const object = resolvePath(scene, path);
            if (object) applyTransform(object, value);
          });
          setStatus("Mundo conectado · alterações locais restauradas");
        }
      }
    } catch { setStatus("Mundo conectado · save local do Studio ignorado"); }

    let frame = 0;
    const renderEditor = () => {
      frame = requestAnimationFrame(renderEditor);
      if (playMode) return;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      editorCamera.aspect = width / height;
      editorCamera.updateProjectionMatrix();
      orbit.update();
      renderer.render(scene, editorCamera);
    };
    frame = requestAnimationFrame(renderEditor);

    return () => {
      cancelAnimationFrame(frame);
      transform.removeEventListener("dragging-changed", onDragging);
      transform.removeEventListener("objectChange", onChanged);
      transform.detach();
      scene.remove(helper);
      scene.remove(grid);
      orbit.dispose();
      transform.dispose();
      orbitRef.current = null;
      transformRef.current = null;
      editorCameraRef.current = null;
    };
  }, [runtime]);

  useEffect(() => {
    transformRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!runtime) return;
    if (playMode) {
      transformRef.current?.detach();
      if (orbitRef.current) orbitRef.current.enabled = false;
      const snapshot: Record<string, TransformState> = {};
      sceneEntries(runtime.scene).forEach(({ object, path }) => { if (path) snapshot[path] = serializeTransform(object); });
      playSnapshotRef.current = snapshot;
      useGameStore.getState().start();
      setStatus("PLAY · testando o jogo");
    } else {
      if (document.pointerLockElement) void document.exitPointerLock();
      useGameStore.setState({ started: false });
      Object.entries(playSnapshotRef.current).forEach(([path, value]) => {
        const object = resolvePath(runtime.scene, path);
        if (object) applyTransform(object, value);
      });
      if (orbitRef.current) orbitRef.current.enabled = true;
      if (selected) transformRef.current?.attach(selected);
      setStatus("EDIT · alterações de teste revertidas");
    }
  }, [playMode]);

  useEffect(() => {
    if (!runtime) return;
    const canvas = runtime.canvas;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    const onDown = (event: PointerEvent) => { downX = event.clientX; downY = event.clientY; };
    const onUp = (event: PointerEvent) => {
      if (playMode || Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return;
      const camera = editorCameraRef.current;
      if (!camera) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(runtime.scene.children, true).find((entry) => !(entry.object.userData as any).__muscaStudioHelper);
      if (hit) selectObject(hit.object);
    };
    canvas.addEventListener("pointerdown", onDown, true);
    canvas.addEventListener("pointerup", onUp, true);
    return () => { canvas.removeEventListener("pointerdown", onDown, true); canvas.removeEventListener("pointerup", onUp, true); };
  }, [runtime, playMode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (playMode || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "KeyW") setMode("translate");
      if (event.code === "KeyE") setMode("rotate");
      if (event.code === "KeyR") setMode("scale");
      if (event.code === "KeyF" && selected && orbitRef.current) {
        const box = new THREE.Box3().setFromObject(selected);
        const center = box.isEmpty() ? selected.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
        orbitRef.current.target.copy(center);
      }
      if (event.code === "Delete" && selected) removeSelected();
      if (event.ctrlKey && event.code === "KeyD" && selected) { event.preventDefault(); duplicateSelected(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, playMode, runtime]);

  const entries = useMemo(() => runtime ? sceneEntries(runtime.scene) : [], [runtime, revision]);
  const filteredEntries = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query ? entries.filter((entry) => entry.label.toLowerCase().includes(query) || entry.object.type.toLowerCase().includes(query)) : entries;
  }, [entries, filter]);

  const selectObject = (object: THREE.Object3D | null) => {
    if (playMode) return;
    setSelected(object);
    if (object) transformRef.current?.attach(object); else transformRef.current?.detach();
    setRevision((value) => value + 1);
  };

  const markDirty = (object: THREE.Object3D) => {
    if (!runtime) return;
    const path = objectPath(object, runtime.scene);
    if (path) dirtyRef.current[path] = serializeTransform(object);
    setRevision((value) => value + 1);
  };

  const setVector = (kind: "position" | "rotation" | "scale", axis: "x" | "y" | "z", value: number) => {
    if (!selected || !Number.isFinite(value)) return;
    if (kind === "rotation") selected.rotation[axis] = THREE.MathUtils.degToRad(value);
    else selected[kind][axis] = value;
    selected.updateMatrixWorld(true);
    markDirty(selected);
  };

  const duplicateSelected = () => {
    if (!selected?.parent) return;
    const clone = selected.clone(true);
    clone.name = `${selected.name || selected.type} Copy`;
    clone.position.x += 0.5;
    clone.userData = { ...clone.userData, studioOwned: true };
    selected.parent.add(clone);
    selectObject(clone);
    setStatus("Objeto duplicado · Ctrl+D");
  };

  const removeSelected = () => {
    if (!selected?.parent) return;
    selected.parent.remove(selected);
    transformRef.current?.detach();
    setSelected(null);
    setRevision((value) => value + 1);
    setStatus("Objeto removido da sessão do Studio");
  };

  const addPrimitive = (kind: "box" | "sphere" | "cylinder") => {
    if (!runtime) return;
    const geometry = kind === "box" ? new THREE.BoxGeometry(1, 1, 1) : kind === "sphere" ? new THREE.SphereGeometry(0.5, 24, 16) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x9da9b8, roughness: 0.72 }));
    mesh.name = kind === "box" ? "Bloco" : kind === "sphere" ? "Esfera" : "Cilindro";
    mesh.userData.studioOwned = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const target = orbitRef.current?.target ?? new THREE.Vector3();
    mesh.position.copy(target).add(new THREE.Vector3(0, 0.5, 0));
    runtime.scene.add(mesh);
    selectObject(mesh);
    setStatus(`${mesh.name} adicionado ao mundo`);
  };

  const importModel = (file: File) => {
    if (!runtime) return;
    const url = URL.createObjectURL(file);
    new GLTFLoader().load(url, (gltf) => {
      URL.revokeObjectURL(url);
      const object = gltf.scene;
      object.name = file.name.replace(/\.(glb|gltf)$/i, "");
      object.userData.studioOwned = true;
      const target = orbitRef.current?.target ?? new THREE.Vector3();
      object.position.copy(target);
      runtime.scene.add(object);
      selectObject(object);
      setStatus(`Modelo importado: ${file.name}`);
    }, undefined, (error) => {
      URL.revokeObjectURL(url);
      setStatus(`Falha ao importar modelo: ${String(error)}`);
    });
  };

  const saveLocal = () => {
    const patch: StudioPatch = { version: 1, objects: { ...dirtyRef.current } };
    localStorage.setItem(SAVE_KEY, JSON.stringify(patch));
    setStatus(`Salvo localmente · ${Object.keys(patch.objects).length} objetos alterados`);
  };

  const exportPatch = () => {
    const patch: StudioPatch = { version: 1, objects: { ...dirtyRef.current } };
    downloadJson("musca-studio-patch.json", patch);
    setStatus("Patch JSON exportado");
  };

  const importPatch = async (file: File) => {
    if (!runtime) return;
    try {
      const patch = JSON.parse(await file.text()) as StudioPatch;
      if (patch.version !== 1 || !patch.objects) throw new Error("formato incompatível");
      dirtyRef.current = { ...patch.objects };
      Object.entries(patch.objects).forEach(([path, value]) => {
        const object = resolvePath(runtime.scene, path);
        if (object) applyTransform(object, value);
      });
      localStorage.setItem(SAVE_KEY, JSON.stringify(patch));
      setRevision((value) => value + 1);
      setStatus("Patch importado e aplicado ao mundo");
    } catch (error) { setStatus(`Patch inválido: ${String(error)}`); }
  };

  const resetLocal = () => {
    localStorage.removeItem(SAVE_KEY);
    dirtyRef.current = {};
    setStatus("Save local removido · recarregue para restaurar o mapa original");
  };

  return <div className={`studio-root ${playMode ? "studio-playing" : ""}`}>
    <GameApp />
    <div className="studio-ui">
      <header className="studio-topbar">
        <div className="studio-brand"><strong>MUSCA <span>STUDIO</span></strong><small>{status}</small></div>
        <div className="studio-tools">
          {!playMode && <>
            <button className={mode === "translate" ? "active" : ""} onClick={() => setMode("translate")}>Mover <kbd>W</kbd></button>
            <button className={mode === "rotate" ? "active" : ""} onClick={() => setMode("rotate")}>Rotacionar <kbd>E</kbd></button>
            <button className={mode === "scale" ? "active" : ""} onClick={() => setMode("scale")}>Escalar <kbd>R</kbd></button>
            <button onClick={saveLocal}>Salvar local</button>
            <button onClick={exportPatch}>Exportar JSON</button>
          </>}
          <button className={playMode ? "stop" : "play"} onClick={() => setPlayMode((value) => !value)}>{playMode ? "■ Stop" : "▶ Play"}</button>
          <a href={window.location.pathname}>Abrir jogo</a>
        </div>
      </header>

      {!playMode && <>
        <aside className="studio-explorer">
          <div className="studio-panel-title"><strong>Explorer</strong><span>{entries.length}</span></div>
          <input className="studio-search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar objeto…" />
          <div className="studio-tree">
            {filteredEntries.map((entry) => <button key={entry.object.uuid} className={selected === entry.object ? "selected" : ""} style={{ paddingLeft: 12 + entry.depth * 14 }} onClick={() => selectObject(entry.object)} title={entry.object.type}><span>{entry.object.type === "Mesh" ? "◇" : entry.object.type === "Group" ? "▦" : "•"}</span>{entry.label}</button>)}
          </div>
          <div className="studio-create">
            <strong>Adicionar</strong>
            <div><button onClick={() => addPrimitive("box")}>Bloco</button><button onClick={() => addPrimitive("sphere")}>Esfera</button><button onClick={() => addPrimitive("cylinder")}>Cilindro</button></div>
            <button onClick={() => modelRef.current?.click()}>Importar GLB / GLTF</button>
            <input ref={modelRef} hidden type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(event) => { const file = event.target.files?.[0]; if (file) importModel(file); event.currentTarget.value = ""; }} />
          </div>
        </aside>

        <aside className="studio-properties">
          <div className="studio-panel-title"><strong>Properties</strong>{selected && <span>{selected.type}</span>}</div>
          {!selected ? <div className="studio-empty">Clique em um objeto no mapa ou no Explorer.</div> : <div className="studio-property-body">
            <label className="studio-wide"><span>Nome</span><input value={selected.name} onChange={(event) => { selected.name = event.target.value; markDirty(selected); }} /></label>
            <label className="studio-check"><input type="checkbox" checked={selected.visible} onChange={(event) => { selected.visible = event.target.checked; markDirty(selected); }} /><span>Visível</span></label>
            {(["position", "rotation", "scale"] as const).map((kind) => <section key={kind} className="studio-vector"><strong>{kind === "position" ? "Posição" : kind === "rotation" ? "Rotação" : "Escala"}</strong><div>{(["x", "y", "z"] as const).map((axis) => {
              const raw = kind === "rotation" ? THREE.MathUtils.radToDeg(selected.rotation[axis]) : selected[kind][axis];
              return <label key={axis}><span>{axis.toUpperCase()}</span><input type="number" step={kind === "rotation" ? 1 : 0.1} value={numberValue(raw)} onChange={(event) => setVector(kind, axis, Number(event.target.value))} /></label>;
            })}</div></section>)}
            <div className="studio-object-actions"><button onClick={duplicateSelected}>Duplicar <kbd>Ctrl+D</kbd></button><button onClick={removeSelected} className="danger">Apagar <kbd>Del</kbd></button></div>
            <div className="studio-meta"><span>UUID</span><code>{selected.uuid}</code><span>Path</span><code>{runtime ? objectPath(selected, runtime.scene) : "-"}</code></div>
          </div>}
          <div className="studio-project-actions"><button onClick={() => importRef.current?.click()}>Importar patch JSON</button><button onClick={resetLocal}>Limpar alterações locais</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPatch(file); event.currentTarget.value = ""; }} /></div>
        </aside>

        <div className="studio-hint">Mouse: selecionar · botão esquerdo no vazio/orbit gizmo · roda: zoom · <kbd>F</kbd> focar · <kbd>W</kbd>/<kbd>E</kbd>/<kbd>R</kbd> transformar</div>
      </>}

      {playMode && <div className="studio-play-banner"><strong>PLAY MODE</strong><span>Você está testando a cena. Clique em Stop para voltar e restaurar o estado anterior ao teste.</span></div>}
    </div>
  </div>;
}
