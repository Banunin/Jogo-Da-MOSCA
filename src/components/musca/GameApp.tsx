import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/game/store";
import { DebugPanel } from "./DebugPanel";
import { Hud } from "./Hud";
import { LabPanel } from "./LabPanel";
import { MiniMap } from "./MiniMap";
import { StartScreen } from "./StartScreen";
import { StageComplete } from "./StageComplete";
import { MissionComplete } from "./MissionComplete";
import { MapSelect } from "./MapSelect";
import { TouchControls, type TouchBridge } from "./TouchControls";
import { loadModels } from "@/game/model-library";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [touch, setTouch] = useState<TouchBridge | null>(null);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState("");
  const started = useGameStore((s) => s.started);
  const labOpen = useGameStore((s) => s.labOpen);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const mapOpen = useGameStore((s) => s.mapOpen);
  const mapSelectOpen = useGameStore((s) => s.mapSelectOpen);
  const debugOpen = useGameStore((s) => s.debugOpen);
  const vision = useGameStore((s) => s.snapshot.modules.vision);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let sim: { dispose: () => void } | null = null;

    void Promise.all([import("@/game/simulation"),loadModels()]).then(([{ Simulation }]) => {
      if (disposed || !canvasRef.current) return;
      const instance = new Simulation(canvasRef.current, (snap) => {
        useGameStore.getState().applySnapshot(snap);
      });
      instance.start();
      sim = instance;
      useGameStore.getState().syncSimulation();
      setReady(true);
      setTouch({
        setMove: (x, z) => {
          instance.input.touchMoveX = x;
          instance.input.touchMoveZ = z;
        },
        setLook: (x, y) => {
          instance.input.touchLookX += x;
          instance.input.touchLookY += y;
        },
        setUp: (v) => {
          instance.input.touchUp = v;
        },
        setDown: (v) => {
          instance.input.touchDown = v;
        },
        setBoost: (v) => {
          instance.input.touchBoost = v;
        },
        setLand: (v) => {
          instance.input.touchLand = v;
        },
        setInteract: (v) => {
          instance.input.touchInteract = v;
        },
        setZoom: (delta) => {
          instance.input.addZoom(delta);
        },
      });
    }).catch(e=>setError("Não foi possível carregar o cenário. Recarregue a página. "+String(e)));

    return () => {
      disposed = true;
      sim?.dispose();
    };
  }, []);

  // Keep the rendered camera authoritative even if the simulation bridge was
  // recreated by React StrictMode/HMR. A camera button can never leave the UI in
  // one mode while the WebGL simulation remains in another.
  useEffect(() => {
    if (!ready) return;
    window.__muscaSim?.setCameraMode(cameraMode);
  }, [cameraMode, ready]);

  useEffect(() => {
    let wasLocked = document.pointerLockElement === canvasRef.current;
    let unlockedAt = -Infinity;
    const onLockChange = () => {
      const locked = document.pointerLockElement === canvasRef.current;
      if (wasLocked && !locked) unlockedAt = performance.now();
      wasLocked = locked;
    };
    const onKey = (event: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (!state.started) return;
      const editing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement;
      if (editing) return;

      // TAB é o único atalho de painel. Abre diretamente Configurações e fecha no segundo toque.
      if (event.code === "Tab") {
        event.preventDefault();
        state.setLabOpen(!state.labOpen, "settings");
        return;
      }

      // Camera modes remain accessible while pointer lock is active. This does
      // not change ESC's single responsibility (cursor lock/unlock).
      if (event.code === "KeyC" && !state.labOpen) {
        event.preventDefault();
        const next = state.cameraMode === "first" ? "third" : state.cameraMode === "third" ? "observation" : "first";
        state.setCameraMode(next);
        return;
      }

      // V / B trocam qual ator a câmera de observação acompanha (mosca, humanos,
      // aranha). Só fazem sentido nesse modo, então não roubam as
      // teclas em 1ª/3ª pessoa.
      if ((event.code === "KeyV" || event.code === "KeyB") && state.cameraMode === "observation" && !state.labOpen) {
        event.preventDefault();
        if (event.repeat) return;
        window.__muscaSim?.cycleObserverTarget(event.code === "KeyV" ? 1 : -1);
        return;
      }

      // ESC nunca navega menus. Com pointer lock ativo, o próprio navegador solta o cursor.
      // Quando o cursor já está livre, um novo ESC prende novamente. A janela curta evita
      // que o mesmo pressionamento que soltou o cursor o prenda de novo em alguns browsers.
      if (event.code === "Escape" && !state.labOpen && document.pointerLockElement !== canvasRef.current) {
        if (performance.now() - unlockedAt < 280) return;
        event.preventDefault();
        window.__muscaSim?.requestLock();
      }
    };
    document.addEventListener("pointerlockchange", onLockChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const veil = 0.25 + (1 - (vision ?? 1)) * 0.7;

  return (
    <div className="game-root">
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="vision-veil" style={{ opacity: veil }} />
      <div className="hud-layer">
        {error ? <div className="load-message" role="alert">{error}</div> : !ready ? <div className="load-message">Carregando modelos…</div> : started ? (!labOpen && <Hud />) : <StartScreen />}
        {started && labOpen ? <LabPanel /> : null}
        {started && mapOpen && !labOpen && !mapSelectOpen ? <MiniMap /> : null}
        {started && mapSelectOpen && !labOpen ? <MapSelect /> : null}
        {started && debugOpen && !labOpen && !mapSelectOpen ? <DebugPanel /> : null}
        {started && !labOpen && !mapSelectOpen ? <TouchControls bridge={touch} /> : null}
        {started ? <StageComplete /> : null}
        {started ? <MissionComplete /> : null}
      </div>
    </div>
  );
}
