import { useGameStore } from "@/game/store";
import type { EntityKind, MemoryKind } from "@/game/types";

const ROOM_W = 22;
const ROOM_D = 16;

function colorFor(kind: EntityKind | MemoryKind): string {
  if (kind === "player") return "#ece8df";
  if (kind === "fly") return "#b7c4bc";
  if (kind === "food") return "#b89a62";
  if (kind === "spider" || kind === "danger") return "#c45c4a";
  if (kind === "human") return "#9b9688";
  if (kind === "safe") return "#6a8f78";
  return "#6f6b60";
}

function toPct(x: number, z: number): { left: string; top: string } {
  const left = ((x + ROOM_W / 2) / ROOM_W) * 100;
  const top = ((z + ROOM_D / 2) / ROOM_D) * 100;
  return { left: `${left}%`, top: `${top}%` };
}

export function MiniMap() {
  const snapshot = useGameStore((s) => s.snapshot);
  return (
    <div
      className="panel panel-tight absolute p-3 z-10"
      style={{ right: "1rem", bottom: "6rem", width: "13rem" }}
    >
      <p className="kicker mb-2">Mapa</p>
      <div
        className="relative overflow-hidden"
        style={{ height: "9rem", borderRadius: "8px", background: "var(--color-bg)" }}
      >
        {snapshot.memories.map((m) => {
          const p = toPct(m.x, m.z);
          return (
            <span
              key={m.id}
              className="map-dot"
              style={{ left: p.left, top: p.top, background: colorFor(m.kind), opacity: 0.85 }}
            />
          );
        })}
        {snapshot.entities.map((e) => {
          const p = toPct(e.x, e.z);
          const player = e.kind === "player";
          return (
            <span
              key={e.id}
              className="map-dot"
              style={{
                left: p.left,
                top: p.top,
                background: colorFor(e.kind),
                width: player ? 9 : 7,
                height: player ? 9 : 7,
                boxShadow: player ? "0 0 0 2px #121410" : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs text-muted">
        <span>Você</span>
        <span className="text-safe">seguro</span>
        <span className="text-food">comida</span>
        <span className="text-danger">perigo</span>
      </div>
    </div>
  );
}
