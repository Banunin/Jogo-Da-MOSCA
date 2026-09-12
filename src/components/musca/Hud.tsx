import { useEffect } from "react";
import { Binoculars, Brain, Bug, Camera, FlaskConical, Map as MapIcon, MapPinned, Maximize2, Settings, SwitchCamera } from "lucide-react";
import { STATE_LABELS, type GameSnapshot, type SimulationTelemetry } from "@/game/types";
import { STAGES, useGameStore } from "@/game/store";
import { mapDefinition } from "@/game/maps";
import { useMultiplayerStore } from "@/game/multiplayer";
import { MISSIONS, gameModeDefinition, missionMetricValue } from "@/game/scenarios";

function Meter({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  const danger = inverse ? value < 25 : value > 75;
  return <div className="chip meter-chip"><span>{label}</span><div className={"meter " + (danger ? "danger" : "")}>
    <i style={{ width: Math.round(value) + "%" }} /></div><b>{Math.round(value)}</b></div>;
}

function objectiveProgressText(id: string, current: GameSnapshot, base: SimulationTelemetry): string | null {
  const t = current.telemetry;
  const delta = (now: number, before: number) => Math.max(0, now - before);
  switch (id) {
    case "land-variety": return `${Math.min(3, new Set(t.landedSurfaces.filter((v) => !base.landedSurfaces.includes(v))).size)} / 3 superfícies`;
    case "land-five": return `${Math.min(5, new Set(t.landedSurfaces.filter((v) => !base.landedSurfaces.includes(v))).size)} / 5 superfícies`;
    case "evade-three":
    case "clean-dodges": return `${Math.min(3, delta(t.attacksEvaded, base.attacksEvaded))} / 3 ataques`;
    case "swatter-evade": return `${Math.min(3, delta(t.attacksEvaded, base.attacksEvaded))} / 3 golpes`;
    case "evade-two": return `${Math.min(2, delta(t.attacksEvaded, base.attacksEvaded))} / 2 ataques`;
    case "near-human": return `${Math.min(6, Math.floor(delta(t.nearHumanSeconds, base.nearHumanSeconds)))} / 6 s`;
    case "explore-room": return `${Math.min(18, Math.floor(delta(t.flightDistance, base.flightDistance)))} / 18 m`;
    case "monitor": return `${Math.min(1, delta(t.monitorLandings, base.monitorLandings))} / 1`;
    case "keyboard": return `${Math.min(1, delta(t.keyboardLandings, base.keyboardLandings))} / 1`;
    case "press-key": return `${Math.min(1, delta(t.keyboardPresses, base.keyboardPresses))} / 1`;
    default: return null;
  }
}

export function Hud() {
  const snapshot = useGameStore((s) => s.snapshot);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const playerControl = useGameStore((s) => s.playerControl);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const setPlayerControl = useGameStore((s) => s.setPlayerControl);
  const setLabOpen = useGameStore((s) => s.setLabOpen);
  const toggleMap = useGameStore((s) => s.toggleMap);
  const toggleMapSelect = useGameStore((s) => s.toggleMapSelect);
  const selectedMap = useGameStore((s) => s.selectedMap);
  const selectedMode = useGameStore((s) => s.selectedMode);
  const selectedMissionId = useGameStore((s) => s.selectedMissionId);
  const missionRuntime = useGameStore((s) => s.missionRuntime);
  const toggleDebug = useGameStore((s) => s.toggleDebug);
  const mapOpen = useGameStore((s) => s.mapOpen);
  const debugOpen = useGameStore((s) => s.debugOpen);
  const progression = useGameStore((s) => s.progression);
  const notice = useGameStore((s) => s.notice);
  const noticeSeq = useGameStore((s) => s.noticeSeq);
  const clearNotice = useGameStore((s) => s.clearNotice);
  const resetSimulation = useGameStore((s) => s.resetSimulation);
  const flyPoints = useGameStore((s) => s.flyPoints);
  const mpRole = useMultiplayerStore((s) => s.role);
  const mpStatus = useMultiplayerStore((s) => s.status);
  const stage = STAGES[progression.stageIndex]!;
  const environment = mapDefinition(selectedMap);
  const modeDefinition = gameModeDefinition(selectedMode);
  const legacyCampaign = selectedMode === "campaign" && selectedMap === "bedroom" && STAGES.some((item) => item.id === selectedMissionId);
  const customMission = MISSIONS.find((mission) => mission.id === selectedMissionId);
  const required = stage.objectives.filter((o) => !o.optional);
  const currentObjective = legacyCampaign ? required.find((o) => !progression.objectiveDone.includes(o.id)) : undefined;
  const currentObjectiveProgress = currentObjective ? objectiveProgressText(currentObjective.id, snapshot, progression.stageStartCounters) : null;
  const progress = required.length ? progression.objectiveDone.length / required.length : 1;
  const customObjective = customMission && missionRuntime ? customMission.objectives.find((objective) => !missionRuntime.done.includes(objective.id)) : customMission?.objectives[0];
  const customValue = customObjective && missionRuntime ? missionMetricValue(customObjective.metric, snapshot, missionRuntime) : 0;
  const customProgress = customMission?.objectives.length && missionRuntime ? missionRuntime.done.length / customMission.objectives.length : 0;
  const isHumanPlayer = mpRole === "human-1";
  const controlledHuman = snapshot.humans[0];
  const humanThreat = isHumanPlayer ? undefined : snapshot.humans.find((human) => human.raging) ?? snapshot.humans.find((human) => ["NOTICE_FLY", "ANNOYED", "ATTACKING", "SEARCHING"].includes(human.state));

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clearNotice, 2400);
    return () => window.clearTimeout(timer);
  }, [notice, noticeSeq, clearNotice]);

  return <>
    <div className="hud-top-left">
      {isHumanPlayer ? <>
        <div className="chip state-chip">HUMANO · {controlledHuman?.state ?? "ATIVO"}</div>
        <Meter label="RAIVA" value={(controlledHuman?.anger ?? 0) * 100} />
      </> : <>
        <div className="chip state-chip"><Bug className="size-4" />{STATE_LABELS[snapshot.state]}</div>
        <Meter label="HP" value={snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp * 100 : 0} inverse />
        <Meter label="FOME" value={snapshot.hunger} />
        <Meter label="ENERGIA" value={snapshot.energy} inverse />
        <Meter label="MEDO" value={snapshot.fear} />
        <div className="chip points-chip">PTS <b>{flyPoints}</b></div>
      </>}
      {mpRole && <div className="chip multiplayer-chip">SALA · {mpRole === "human-1" ? "HUMANO" : mpRole.toUpperCase()}</div>}
    </div>
    <div className="hud-top-right">
      <button type="button" aria-pressed={cameraMode === "first"} className={"btn " + (cameraMode === "first" ? "active" : "btn-ghost")} onClick={() => setCameraMode("first")}><Bug className="size-4" /><span className="desktop-label">1ª pessoa</span></button>
      <button type="button" aria-pressed={cameraMode === "third"} className={"btn " + (cameraMode === "third" ? "active" : "btn-ghost")} onClick={() => setCameraMode("third")}><Camera className="size-4" /><span className="desktop-label">3ª pessoa</span></button>
      <button type="button" aria-pressed={cameraMode === "observation"} className={"btn " + (cameraMode === "observation" ? "active" : "btn-ghost")} onClick={() => setCameraMode("observation")}><Binoculars className="size-4" /><span className="desktop-label">Observação</span></button>
      {cameraMode === "observation" && (
        <button type="button" className="btn btn-ghost" aria-label="Trocar alvo observado" onClick={() => window.__muscaSim?.cycleObserverTarget(1)}>
          <SwitchCamera className="size-4" /><span className="desktop-label">{snapshot.observerTargetLabel ?? "Trocar alvo"}</span>
        </button>
      )}
      {!isHumanPlayer && <button className={"btn " + (playerControl ? "active" : "btn-ghost")} onClick={() => setPlayerControl(!playerControl)}>{playerControl ? "CONTROLE" : "IA ATIVA"}</button>}
      <button aria-label="Minimapa" className={"btn " + (mapOpen ? "active" : "btn-ghost")} onClick={toggleMap}><MapIcon className="size-4" /></button>
      <button aria-label="Selecionar ambiente" className="btn btn-ghost" onClick={toggleMapSelect}><MapPinned className="size-4" /><span className="desktop-label">{environment.name}</span></button>
      <button aria-label="Debug" className={"btn " + (debugOpen ? "active" : "btn-ghost")} onClick={toggleDebug}><Brain className="size-4" /></button>
      <button aria-label="Tela cheia" className="btn btn-ghost" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => undefined); }}><Maximize2 className="size-4" /><span className="desktop-label">Tela cheia</span></button>
      <button aria-label="Configurações" className="btn btn-ghost" onClick={() => setLabOpen(true, "settings")}><Settings className="size-4" /></button>
      <button className="btn btn-primary" onClick={() => setLabOpen(true, "tasks")}><FlaskConical className="size-4" />Laboratório</button>
    </div>
    <div className="camera-mode-chip" aria-live="polite">
      CÂMERA · {cameraMode === "first" ? "1ª PESSOA" : cameraMode === "third" ? "3ª PESSOA" : "OBSERVAÇÃO"}
      {cameraMode === "observation" && snapshot.observerTargetLabel && <span className="observer-target-label"> · {snapshot.observerTargetLabel.toUpperCase()}</span>}
      <small>{cameraMode === "third" ? "C alterna · mouse/toque orbita · roda aplica zoom" : cameraMode === "observation" ? "C alterna · mouse/toque orbita · roda zoom · V/B trocam alvo" : "C alterna"}</small>
    </div>
    {isHumanPlayer ? <div className="objective-card stage-objective-card free-roam-card">
      <span>MULTIPLAYER · HUMANO</span>
      <strong>Proteja seu espaço das moscas</strong>
      <small>Observe, aproxime-se e use F para atacar. As vagas e posições são sincronizadas pela sala multiplayer.</small>
    </div> : legacyCampaign ? <div className="objective-card stage-objective-card">
      <span>QUARTO · FASE {stage.number.toString().padStart(2, "0")} · {stage.name.toUpperCase()}</span>
      <strong>{currentObjective?.label ?? "Objetivos principais concluídos"}</strong>
      <small>{currentObjective?.description ?? "Explore os objetivos opcionais ou avance para a próxima fase."}</small>
      {currentObjectiveProgress && <em className="objective-live-progress">{currentObjectiveProgress}</em>}
      <div className="objective-count">{progression.objectiveDone.length} / {required.length}</div>
      <i style={{ width: progress * 100 + "%" }} />
    </div> : customMission ? <div className="objective-card stage-objective-card">
      <span>{environment.name.toUpperCase()} · {modeDefinition.name.toUpperCase()} · {customMission.name.toUpperCase()}</span>
      <strong>{customObjective?.label ?? "Missão concluída"}</strong>
      <small>{customObjective?.description ?? customMission.description}</small>
      {customObjective && missionRuntime && <em className="objective-live-progress">{Math.min(customObjective.target, Math.floor(customValue * 10) / 10)} / {customObjective.target}</em>}
      <div className="objective-count">{missionRuntime?.done.length ?? 0} / {customMission.objectives.length}</div>
      <i style={{ width: customProgress * 100 + "%" }} />
    </div> : <div className="objective-card stage-objective-card free-roam-card">
      <span>{environment.name.toUpperCase()} · {modeDefinition.name.toUpperCase()}</span>
      <strong>{environment.subtitle}</strong>
      <small>{selectedMode === "multiplayer" ? "Sessão de rede ativa. Coordene-se com os outros jogadores." : environment.objectives.join(" · ")}</small>
    </div>}
    {humanThreat && <div className={"danger-callout " + (humanThreat.state === "ATTACKING" || humanThreat.raging ? "attack" : "")}>
      <span>{humanThreat.raging ? "RAIVA" : humanThreat.state === "ATTACKING" ? "ATAQUE" : humanThreat.state === "SEARCHING" ? "PROCURANDO" : "PERIGO"}</span>
      <strong>{humanThreat.raging ? `${humanThreat.label} perdeu a paciência — ele está mais rápido e forte` : humanThreat.state === "ATTACKING" ? "Desvie ou use cobertura" : `${humanThreat.label} está reagindo à sua presença`}</strong>
    </div>}
    {snapshot.dead && <div className="death-overlay" role="dialog" aria-label="Mosca morreu">
      <div className="death-card panel"><span>FIM DA MOSCA</span><strong>Você morreu</strong><small>HP chegou a zero. Reinicie a simulação para continuar.</small><button className="btn btn-primary" onClick={resetSimulation}>Recomeçar</button></div>
    </div>}
    {snapshot.event && <div className="hud-event"><div className="chip">{snapshot.event}</div></div>}
    {notice && <div className="hud-notice" role="status">{notice}</div>}
    {cameraMode === "first" && <div className="crosshair" />}
    {mpRole === "human-1" && mpStatus === "connected" && <div className="human-control-hint"><strong>HUMANO</strong><span>WASD mover · Mouse olhar · Shift correr · F atacar</span></div>}
    <div className="mind-readout"><span>{isHumanPlayer ? "CONTROLE HUMANO" : "PENSAMENTO"}</span><strong>{isHumanPlayer ? (controlledHuman?.raging ? "RAIVA — movimentos e golpes mais fortes" : controlledHuman?.blinking ? "PISCANDO — percepção reduzida" : "Observe as moscas e escolha quando atacar") : snapshot.thought}</strong>
      {!isHumanPlayer && !playerControl && <small>ALVO: {snapshot.destination?.label ?? "nenhum"}</small>}</div>
  </>;
}
