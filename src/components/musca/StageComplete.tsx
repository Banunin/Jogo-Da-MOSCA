import { Check, Circle, Compass, RotateCcw } from "lucide-react";
import { STAGES, useGameStore } from "@/game/store";

export function StageComplete() {
  const open = useGameStore((s) => s.stageSummaryOpen);
  const progression = useGameStore((s) => s.progression);
  const secrets = useGameStore((s) => s.foundSecrets);
  const continueStage = useGameStore((s) => s.continueStage);
  const restartStage = useGameStore((s) => s.restartStage);
  const stageRecords = useGameStore((s) => s.stageRecords);
  if (!open) return null;
  const stage = STAGES[progression.stageIndex]!;
  const elapsed = Math.max(0, Math.floor((performance.now() - progression.stageStartedAt) / 1000));
  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");
  const optionalTotal = stage.objectives.filter((o) => o.optional).length;
  const record = stageRecords[stage.id];

  return <div className="stage-complete-backdrop">
    <section className="stage-complete panel" role="dialog" aria-modal="true" aria-label="Fase concluída">
      <span className="eyebrow"><Check className="size-4" /> FASE CONCLUÍDA</span>
      <p className="stage-number">FASE {stage.number.toString().padStart(2, "0")}</p>
      <h2>{stage.name}</h2>
      <p className="stage-completion-copy">{stage.completion}</p>
      <div className="stage-summary-grid">
        <div><span>Tempo</span><strong>{mm}:{ss}</strong></div>
        <div><span>Objetivos</span><strong>{progression.objectiveDone.length}/{stage.objectives.filter((o) => !o.optional).length}</strong></div>
        <div><span>Opcionais</span><strong>{progression.optionalDone.length}/{optionalTotal}</strong></div>
        <div><span>Segredos</span><strong>{secrets.filter((id) => ["pc-message","under-bed-token","wardrobe-note","shelf-web","window-mark"].includes(id)).length}/5</strong></div>
      </div>
      {record && <div className="stage-meta">
        <span>MELHOR TEMPO · {Math.floor(record.bestTime / 60).toString().padStart(2,"0")}:{(record.bestTime % 60).toString().padStart(2,"0")}</span>
        <span>ATAQUES EVITADOS · {record.bestAttacksEvaded}</span>
        <span>ALIMENTOS CONSUMIDOS · {record.bestFood}</span>
        <span>CONCLUSÕES · {record.completions}</span>
      </div>}
      <div className="completion-objectives">
        {stage.objectives.map((objective) => {
          const done = objective.optional ? progression.optionalDone.includes(objective.id) : progression.objectiveDone.includes(objective.id);
          return <div key={objective.id} className={done ? "complete" : ""}>
            {done ? <Check className="size-4" /> : <Circle className="size-4" />}
            <span>{objective.label}{objective.optional ? " · opcional" : ""}</span>
          </div>;
        })}
      </div>
      <div className="stage-complete-actions">
        <button className="btn btn-ghost" onClick={restartStage}><RotateCcw className="size-4" /> Repetir fase</button>
        <button className="btn btn-primary" onClick={continueStage}><Compass className="size-4" /> {progression.stageIndex === STAGES.length - 1 ? "Continuar no mundo" : "Próxima fase"}</button>
      </div>
    </section>
  </div>;
}
