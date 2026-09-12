import { CheckCircle2, Compass, MapPinned, X } from "lucide-react";
import { MAPS, type MapId } from "@/game/maps";
import { STAGES, useGameStore } from "@/game/store";

const SECRET_IDS: Record<MapId, string[]> = {
  bedroom: ["pc-message", "under-bed-token", "wardrobe-note", "shelf-web", "window-mark"],
  kitchen: ["kitchen-sill", "under-counter", "stove-note"],
  garden: ["garden-coin", "garden-mark", "garden-nest"],
};

export function MapSelect() {
  const selectedMap = useGameStore((s) => s.selectedMap);
  const choose = useGameStore((s) => s.setSelectedMap);
  const close = useGameStore((s) => s.toggleMapSelect);
  const completedStages = useGameStore((s) => s.completedStages);
  const foundSecrets = useGameStore((s) => s.foundSecrets);

  return <div className="map-select-backdrop" role="dialog" aria-modal="true" aria-label="Selecionar ambiente">
    <section className="map-select-panel panel">
      <header className="map-select-header">
        <div><span>AMBIENTES</span><h2>Escolha onde voar</h2><p>Cada mapa possui escala, riscos, alimento e rotas próprias.</p></div>
        <button className="icon-btn" aria-label="Fechar seleção de mapas" onClick={close}><X className="size-5" /></button>
      </header>
      <div className="map-card-grid">
        {MAPS.map((map) => {
          const active = map.id === selectedMap;
          const secrets = SECRET_IDS[map.id].filter((id) => foundSecrets.includes(id)).length;
          const completed = map.id === "bedroom" ? completedStages.filter((id) => STAGES.some((stage) => stage.id === id)).length : 0;
          const totalMissions = map.id === "bedroom" ? STAGES.length : 0;
          return <button key={map.id} className={"map-card " + (active ? "active" : "")} onClick={() => choose(map.id)}>
            <div className="map-preview"><img src={map.preview} alt="" /><span className="map-difficulty">{map.difficulty}</span>{active && <i><CheckCircle2 className="size-4" /> ATUAL</i>}</div>
            <div className="map-card-body">
              <div><small>{map.subtitle}</small><strong>{map.name}</strong></div>
              <p>{map.description}</p>
              <div className="map-objective-tags">{map.objectives.slice(0, 3).map((o) => <span key={o}>{o}</span>)}</div>
              <div className="map-progress-row">
                <span><Compass className="size-4" /> {map.campaign ? `${completed}/${totalMissions} fases` : "Exploração livre"}</span>
                <span><MapPinned className="size-4" /> {secrets}/{map.secrets} segredos</span>
              </div>
            </div>
          </button>;
        })}
      </div>
      <footer className="map-select-footer">Quarto é a campanha principal. Cozinha e Jardim já funcionam como ambientes independentes e servem de base para campanhas próprias futuras.</footer>
    </section>
  </div>;
}
