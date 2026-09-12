import { KIND_LABELS, STATE_LABELS } from "@/game/types";
import { useGameStore } from "@/game/store";

export function DebugPanel() {
  const snapshot = useGameStore((s) => s.snapshot);
  const d = snapshot.detected;
  return (
    <div
      className="panel panel-tight absolute p-4 z-10 font-mono text-xs leading-relaxed"
      style={{ bottom: "6rem", left: "1rem", width: "min(20rem, calc(100% - 2rem))" }}
    >
      <p className="kicker mb-3">Debug visual</p>
      <p className="text-muted">VISÃO</p>
      <p className="text-accent">↓ objeto detectado</p>
      {d ? (
        <ul className="mt-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Tipo: {KIND_LABELS[d.kind]}</li>
          <li>Distância: {d.distance.toFixed(1)} m</li>
          <li>Movimento: {d.motion > 1.2 ? "alto" : d.motion > 0.3 ? "médio" : "baixo"}</li>
          <li>Perigo: {Math.round(d.danger * 100)}%</li>
        </ul>
      ) : (
        <p className="mt-2 text-subtle">Nada no campo visual.</p>
      )}
      <p className="mt-3 text-muted">DECISÃO</p>
      <p>{STATE_LABELS[snapshot.state]}</p>
      <p className="mt-3 text-muted">DESTINO</p>
      <p>{snapshot.destination ? snapshot.destination.label : "—"}</p>
      {snapshot.windDetected ? (
        <p className="mt-3 text-accent">Vento → compensação de voo → trajetória</p>
      ) : null}
    </div>
  );
}
