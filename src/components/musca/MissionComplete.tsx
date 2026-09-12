import { Check, Circle, Compass, RotateCcw } from "lucide-react";
import { mapDefinition } from "@/game/maps";
import { gameModeDefinition, MISSIONS, missionMetricValue } from "@/game/scenarios";
import { useGameStore } from "@/game/store";

export function MissionComplete() {
  const open = useGameStore((s) => s.missionCompleteOpen);
  const selectedMissionId = useGameStore((s) => s.selectedMissionId);
  const selectedMap = useGameStore((s) => s.selectedMap);
  const selectedMode = useGameStore((s) => s.selectedMode);
  const runtime = useGameStore((s) => s.missionRuntime);
  const snapshot = useGameStore((s) => s.snapshot);
  const restart = useGameStore((s) => s.restartMission);
  const next = useGameStore((s) => s.continueMission);
  if (!open || !runtime) return null;
  const mission = MISSIONS.find((item) => item.id === selectedMissionId);
  if (!mission) return null;
  const elapsed = Math.max(0, Math.floor((performance.now() - runtime.startedAt) / 1000));
  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  return <div className="stage-complete-backdrop">
    <section className="stage-complete panel" role="dialog" aria-modal="true" aria-label="Missão concluída">
      <span className="eyebrow"><Check className="size-4" /> MISSÃO CONCLUÍDA</span>
      <p className="stage-number">{mapDefinition(selectedMap).name.toUpperCase()} · {gameModeDefinition(selectedMode).name.toUpperCase()}</p>
      <h2>{mission.name}</h2>
      <p className="stage-completion-copy">{mission.description}</p>
      <div className="stage-summary-grid">
        <div><span>Tempo</span><strong>{mm}:{ss}</strong></div>
        <div><span>Objetivos</span><strong>{runtime.done.length}/{mission.objectives.length}</strong></div>
        <div><span>Mapa</span><strong>{mapDefinition(selectedMap).name}</strong></div>
        <div><span>Modo</span><strong>{gameModeDefinition(selectedMode).name}</strong></div>
      </div>
      <div className="completion-objectives">
        {mission.objectives.map((objective) => {
          const done = runtime.done.includes(objective.id);
          const value = missionMetricValue(objective.metric, snapshot, runtime);
          return <div key={objective.id} className={done ? "complete" : ""}>
            {done ? <Check className="size-4" /> : <Circle className="size-4" />}
            <span>{objective.label} · {Math.min(objective.target, Math.floor(value * 10) / 10)}/{objective.target}</span>
          </div>;
        })}
      </div>
      <div className="stage-complete-actions">
        <button className="btn btn-ghost" onClick={restart}><RotateCcw className="size-4" /> Repetir missão</button>
        <button className="btn btn-primary" onClick={next}><Compass className="size-4" /> Próxima missão / continuar</button>
      </div>
    </section>
  </div>;
}
