import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Circle, Hand, ZoomIn, ZoomOut, Zap } from "lucide-react";

export interface TouchBridge {
  setMove: (x: number, z: number) => void;
  setLook: (x: number, y: number) => void;
  setUp: (v: boolean) => void;
  setDown: (v: boolean) => void;
  setBoost: (v: boolean) => void;
  setLand: (v: boolean) => void;
  setInteract: (v: boolean) => void;
  setZoom: (delta: number) => void;
}

export function TouchControls({ bridge }: { bridge: TouchBridge | null }) {
  const moveOrigin = useRef<{ x: number; y: number } | null>(null);
  const lookLast = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(() => () => {
    bridge?.setMove(0, 0);
    bridge?.setUp(false);
    bridge?.setDown(false);
    bridge?.setBoost(false);
    bridge?.setLand(false);
    bridge?.setInteract(false);
  }, [bridge]);

  if (!bridge) return null;

  const releaseMove = () => {
    moveOrigin.current = null;
    setKnob({ x: 0, y: 0 });
    bridge.setMove(0, 0);
  };
  const releaseLook = () => { lookLast.current = null; };

  return (
    <div className="absolute inset-0 z-20 md:hidden touch-control-layer" style={{ pointerEvents: "none" }}>
      <div
        className="touch-stick"
        style={{ pointerEvents: "auto", bottom: "1.25rem", left: "1.25rem" }}
        onPointerDown={(e) => {
          moveOrigin.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!moveOrigin.current) return;
          const rawX = e.clientX - moveOrigin.current.x;
          const rawY = e.clientY - moveOrigin.current.y;
          const len = Math.hypot(rawX, rawY) || 1;
          const max = 42;
          const scale = Math.min(1, max / len);
          const px = rawX * scale;
          const py = rawY * scale;
          setKnob({ x: px, y: py });
          bridge.setMove(px / max, -py / max);
        }}
        onPointerUp={releaseMove}
        onPointerCancel={releaseMove}
        aria-label="Joystick de movimento"
      >
        <span className="touch-knob" style={{ top: `calc(50% + ${knob.y}px)`, left: `calc(50% + ${knob.x}px)` }} />
      </div>
      <div
        className="look-pad"
        style={{ pointerEvents: "auto", right: "1.25rem", bottom: "7rem" }}
        onPointerDown={(e) => {
          lookLast.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!lookLast.current) return;
          const dx = e.clientX - lookLast.current.x;
          const dy = e.clientY - lookLast.current.y;
          lookLast.current = { x: e.clientX, y: e.clientY };
          bridge.setLook(dx * 1.25, dy * 1.25);
        }}
        onPointerUp={releaseLook}
        onPointerCancel={releaseLook}
        aria-label="Área de câmera"
      />
      <div className="touch-action-row flex gap-2 absolute" style={{ pointerEvents: "auto", right: "1.25rem", bottom: "1.25rem" }}>
        <button type="button" className="btn" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); bridge.setUp(true); }} onPointerUp={() => bridge.setUp(false)} onPointerCancel={() => bridge.setUp(false)} aria-label="Subir"><ChevronUp className="size-5" /></button>
        <button type="button" className="btn" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); bridge.setDown(true); }} onPointerUp={() => bridge.setDown(false)} onPointerCancel={() => bridge.setDown(false)} aria-label="Descer"><ChevronDown className="size-5" /></button>
        <button type="button" className="btn" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); bridge.setBoost(true); }} onPointerUp={() => bridge.setBoost(false)} onPointerCancel={() => bridge.setBoost(false)} aria-label="Acelerar"><Zap className="size-5" /></button>
        <button type="button" className="btn touch-primary-action" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); bridge.setInteract(true); }} onPointerUp={() => bridge.setInteract(false)} onPointerCancel={() => bridge.setInteract(false)} aria-label="Interagir ou atacar"><Hand className="size-5" /><span>AÇÃO</span></button>
        <button type="button" className="btn" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); bridge.setLand(true); }} onPointerUp={() => bridge.setLand(false)} onPointerCancel={() => bridge.setLand(false)} aria-label="Pousar"><Circle className="size-5" /></button>
        <button type="button" className="btn touch-camera-zoom" onPointerDown={() => bridge.setZoom(-1)} aria-label="Aproximar câmera"><ZoomIn className="size-5" /></button>
        <button type="button" className="btn touch-camera-zoom" onPointerDown={() => bridge.setZoom(1)} aria-label="Afastar câmera"><ZoomOut className="size-5" /></button>
      </div>
    </div>
  );
}
