import { create } from "zustand";
import type { BrainModuleId, CameraMode, GameSettings, GameSnapshot } from "./types";
import { BRAIN_MODULES } from "./types";
import { fullModules } from "./brain";
import { DEFAULT_SETTINGS } from "./settings";
import { TASKS, updateTasks, type TaskRuntime } from "./tasks";
import { STAGES, createProgression, updateProgression, type ProgressionRuntime } from "./progression";
import type { MapId } from "./maps";
import { MISSIONS, createMissionRuntime, missionUnlocked, missionsFor, updateMissionRuntime, type GameModeId, type MissionRuntime } from "./scenarios";
import { useMultiplayerStore } from "./multiplayer";

const SAVE_KEY = "musca-save-v3-solo";
const LEGACY_SAVE_KEYS = ["musca-save-v2", "musca-save-v1"];

export const INITIAL_SNAPSHOT: GameSnapshot = {
  hp: 100, maxHp: 100, dead: false,
  hunger: 42, energy: 88, fear: 6, curiosity: 51, stress: 8,
  state: "EXPLORANDO", flying: true, landed: false, modules: fullModules(),
  memories: [], perceptions: [], thought: "Ar parado. Comida por perto.", entities: [],
  player: { x: 0, y: 1.9, z: 0, yaw: 0, pitch: 0, speed: 0 },
  windDetected: false, compensating: false, destination: null, detected: null,
  pipeline: { vision: false, perception: false, memory: false, consciousness: true, decision: true, motor: true },
  event: null, humans: [], observerTargetLabel: null,
  telemetry: {
    foodInteractions: 0, landings: 0, flightDistance: 0, humanNotices: 0, humanSwats: 0, humanHits: 0,
    humanMisses: 0, predatorEncounters: 0, predatorEscapes: 0, predatorHits: 0, windSeconds: 0, rareEvents: 0, secrets: [],
    visitedZones: [], landedSurfaces: [], hideoutsFound: [], monitorLandings: 0, keyboardLandings: 0, screenCrossings: 0,
    faceFlybys: 0, humanProvocations: 0, attacksEvaded: 0, swatterAttacks: 0, coverEscapes: 0, humanStoodUp: 0,
    humanLeftComputer: 0, windowVisits: 0, gapPasses: 0, hiddenFoodFound: 0, safeReturns: 0, stealthMeals: 0, nearHumanSeconds: 0,
    keyboardPresses: 0, doorEvents: 0, windowEvents: 0, ambientHumanActions: 0,
  },
  rareEvent: null,
};

export interface FlyProfile {
  id: string;
  name: string;
  modules: Record<BrainModuleId, number>;
  builtIn?: boolean;
}

const normal = fullModules();
const BUILTIN_PROFILES: FlyProfile[] = [
  { id: "normal", name: "Mosca normal", modules: normal, builtIn: true },
  { id: "no-memory", name: "Sem memória", modules: { ...normal, memory: 0 }, builtIn: true },
  { id: "explorer", name: "Exploradora", modules: { ...normal, fear: 0.25, attention: 0.9, navigation: 1 }, builtIn: true },
];

interface PersistedSave {
  settings?: GameSettings;
  modules?: Record<BrainModuleId, number>;
  completedTasks?: string[];
  profiles?: FlyProfile[];
  stageIndex?: number;
  completedStages?: string[];
  foundSecrets?: string[];
  selectedMap?: MapId;
  selectedMode?: GameModeId;
  selectedMissionId?: string | null;
  completedMissions?: string[];
  stageRecords?: Record<string, StageRecord>;
  flyPoints?: number;
}

function loadSave(): PersistedSave {
  try {
    // A beta pública começa limpa. Saves de desenvolvimento anteriores não são migrados.
    for (const key of LEGACY_SAVE_KEYS) localStorage.removeItem(key);
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}");
  } catch { return {}; }
}

const saved: PersistedSave = typeof window === "undefined" ? {} : loadSave();
const savedModules = { ...fullModules(), ...(saved.modules ?? {}) };
const savedSettings: GameSettings = {
  ...DEFAULT_SETTINGS,
  ...(saved.settings ?? {}),
  bindings: { ...DEFAULT_SETTINGS.bindings, ...(saved.settings?.bindings ?? {}) },
};

export interface SimBridge {
  setCameraMode: (mode: CameraMode) => void;
  setPlayerControl: (v: boolean) => void;
  setLabOpen: (v: boolean) => void;
  setDebug: (v: boolean) => void;
  setModule: (id: BrainModuleId, value: number) => void;
  applySettings: (settings: GameSettings) => void;
  setPaused: (paused: boolean) => void;
  setTimeScale: (scale: number) => void;
  setStage: (stageIndex: number) => void;
  setMap: (mapId: MapId) => void;
  setGameMode: (mode: GameModeId) => void;
  reset: () => void;
  unlockAudio: () => void;
  testAudio: () => void;
  requestLock: () => void;
  cycleObserverTarget: (dir: 1 | -1) => void;
}

declare global { interface Window { __muscaSim?: SimBridge; } }
function bridge(): SimBridge | undefined { return typeof window === "undefined" ? undefined : window.__muscaSim; }

function persist(state: GameUIState): void {
  // Multiplayer possui progresso de grupo/sessão e nunca pode contaminar o save Solo individual.
  if (state.selectedMode === "multiplayer" || useMultiplayerStore.getState().room.id) return;
  const data: PersistedSave = {
    settings: state.settings,
    modules: state.snapshot.modules,
    completedTasks: state.taskRuntime.completed,
    profiles: state.profiles.filter((p) => !p.builtIn),
    stageIndex: state.progression.stageIndex,
    completedStages: state.completedStages,
    foundSecrets: state.foundSecrets,
    selectedMap: state.selectedMap,
    selectedMode: state.selectedMode,
    selectedMissionId: state.selectedMissionId,
    completedMissions: state.completedMissions,
    stageRecords: state.stageRecords,
    flyPoints: state.flyPoints,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage may be blocked */ }
}

export interface StageRecord { bestTime: number; bestAttacksEvaded: number; bestFood: number; completions: number; }

export type FlyUpgradeId = "armor" | "wings" | "reflexes" | "metabolism" | "platinum";

export const FLY_UPGRADES: Record<FlyUpgradeId, { name: string; description: string; baseCost: number; max: number }> = {
  armor: { name: "Carapaça reforçada", description: "+20 HP máximo por nível.", baseCost: 55, max: 5 },
  wings: { name: "Asas 2.0", description: "+6% de velocidade por nível.", baseCost: 65, max: 5 },
  reflexes: { name: "Reflexos neurais", description: "+7% de resposta/aceleração por nível.", baseCost: 70, max: 5 },
  metabolism: { name: "Metabolismo eficiente", description: "Reduz o gasto de fome e energia por nível.", baseCost: 60, max: 5 },
  platinum: { name: "Mosca Platinum 2.0", description: "Visual metálico platinum exclusivo.", baseCost: 260, max: 1 },
};

export function upgradeCost(id: FlyUpgradeId, settings: GameSettings): number {
  if (id === "platinum") return FLY_UPGRADES.platinum.baseCost;
  const level = id === "armor" ? settings.upgradeArmor : id === "wings" ? settings.upgradeWings : id === "reflexes" ? settings.upgradeReflexes : settings.upgradeMetabolism;
  return Math.round(FLY_UPGRADES[id].baseCost * (1 + level * 0.55));
}

export interface GameUIState {
  started: boolean;
  cameraMode: CameraMode;
  playerControl: boolean;
  labOpen: boolean;
  labTab: "brain" | "sensors" | "memory" | "profiles" | "settings";
  mapOpen: boolean;
  mapSelectOpen: boolean;
  selectedMap: MapId;
  selectedMode: GameModeId;
  selectedMissionId: string | null;
  missionRuntime: MissionRuntime | null;
  completedMissions: string[];
  missionCompleteOpen: boolean;
  debugOpen: boolean;
  paused: boolean;
  timeScale: number;
  snapshot: GameSnapshot;
  settings: GameSettings;
  taskRuntime: TaskRuntime;
  profiles: FlyProfile[];
  progression: ProgressionRuntime;
  completedStages: string[];
  foundSecrets: string[];
  stageRecords: Record<string, StageRecord>;
  stageSummaryOpen: boolean;
  campaignComplete: boolean;
  notice: string | null;
  noticeSeq: number;
  flyPoints: number;
  start: () => void;
  syncSimulation: () => void;
  setCameraMode: (mode: CameraMode) => void;
  setPlayerControl: (value: boolean) => void;
  setLabOpen: (value: boolean, tab?: GameUIState["labTab"]) => void;
  setLabTab: (tab: GameUIState["labTab"]) => void;
  toggleMap: () => void;
  toggleMapSelect: () => void;
  setSelectedMap: (map: MapId) => void;
  setSelectedMode: (mode: GameModeId) => void;
  setSelectedMission: (id: string | null) => void;
  restartMission: () => void;
  continueMission: () => void;
  closeMissionSummary: () => void;
  toggleDebug: () => void;
  setPaused: (value: boolean) => void;
  setTimeScale: (value: number) => void;
  resetSimulation: () => void;
  applySnapshot: (snapshot: GameSnapshot) => void;
  setModule: (id: BrainModuleId, value: number) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  bindControl: (action: keyof GameSettings["bindings"], code: string) => void;
  loadProfile: (id: string) => void;
  saveProfile: (name: string) => void;
  duplicateProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  resetProgress: () => void;
  restartStage: () => void;
  continueStage: () => void;
  closeStageSummary: () => void;
  clearNotice: () => void;
  buyUpgrade: (id: FlyUpgradeId) => boolean;
}

export const useGameStore = create<GameUIState>((set, get) => ({
  started: false,
  cameraMode: "first",
  playerControl: true,
  labOpen: false,
  labTab: "brain",
  mapOpen: false,
  mapSelectOpen: false,
  selectedMap: saved.selectedMap ?? "bedroom",
  selectedMode: saved.selectedMode ?? "campaign",
  selectedMissionId: saved.selectedMissionId ?? STAGES[Math.min(saved.stageIndex ?? 0, STAGES.length - 1)]!.id,
  missionRuntime: null,
  completedMissions: saved.completedMissions ?? [],
  missionCompleteOpen: false,
  debugOpen: false,
  paused: false,
  timeScale: 1,
  snapshot: { ...INITIAL_SNAPSHOT, modules: savedModules },
  settings: savedSettings,
  taskRuntime: { completed: saved.completedTasks ?? [], sawThreat: false, previousHunger: INITIAL_SNAPSHOT.hunger },
  profiles: [...BUILTIN_PROFILES, ...(saved.profiles ?? [])],
  progression: createProgression(Math.min(saved.stageIndex ?? 0, STAGES.length - 1), { ...INITIAL_SNAPSHOT, modules: savedModules }),
  completedStages: saved.completedStages ?? [],
  foundSecrets: saved.foundSecrets ?? [],
  stageRecords: saved.stageRecords ?? {},
  stageSummaryOpen: false,
  campaignComplete: (saved.completedStages ?? []).includes(STAGES[STAGES.length - 1]!.id),
  notice: null,
  noticeSeq: 0,
  flyPoints: Math.max(0, saved.flyPoints ?? 0),
  start: () => {
    const current = get();
    const legacyIndex = current.selectedMode === "campaign" && current.selectedMap === "bedroom"
      ? STAGES.findIndex((stage) => stage.id === current.selectedMissionId) : -1;
    const hazardMode = current.selectedMode === "survival" || current.selectedMode === "challenge" || current.selectedMode === "multiplayer";
    const stageIndex = legacyIndex >= 0 ? legacyIndex : ((hazardMode || (current.selectedMode === "campaign" && current.selectedMap === "bedroom")) ? STAGES.length - 1 : 0);
    const progression = createProgression(stageIndex, current.snapshot);
    bridge()?.setMap(current.selectedMap);
    bridge()?.setGameMode(current.selectedMode);
    bridge()?.setStage(stageIndex);
    bridge()?.reset();
    set({ started: true, paused: false, progression, stageSummaryOpen: false, missionCompleteOpen: false, missionRuntime: null });
    bridge()?.setPaused(false); bridge()?.unlockAudio(); bridge()?.requestLock();
    persist(get());
  },
  syncSimulation: () => {
    const s = get();
    bridge()?.applySettings(s.settings);
    bridge()?.setMap(s.selectedMap);
    bridge()?.setGameMode(s.selectedMode);
    bridge()?.setCameraMode(s.cameraMode);
    bridge()?.setPlayerControl(s.playerControl);
    bridge()?.setTimeScale(s.timeScale);
    bridge()?.setStage(s.progression.stageIndex);
    bridge()?.setPaused(s.paused || !s.started);
    for (const id of BRAIN_MODULES) bridge()?.setModule(id, s.snapshot.modules[id]);
  },
  setCameraMode: (cameraMode) => { set({ cameraMode }); bridge()?.setCameraMode(cameraMode); },
  setPlayerControl: (playerControl) => { set({ playerControl }); bridge()?.setPlayerControl(playerControl); },
  setLabOpen: (labOpen, tab) => {
    set(tab ? { labOpen, labTab: tab } : { labOpen });
    bridge()?.setLabOpen(labOpen);
    if (labOpen) { try { document.exitPointerLock(); } catch { /* ignore */ } }
    else if (!get().paused) bridge()?.requestLock();
  },
  setLabTab: (labTab) => set({ labTab }),
  toggleMap: () => set({ mapOpen: !get().mapOpen }),
  toggleMapSelect: () => {
    const mapSelectOpen = !get().mapSelectOpen;
    set({ mapSelectOpen });
    if (mapSelectOpen) { try { document.exitPointerLock(); } catch { /* ignore */ } }
    else if (!get().paused && get().started) bridge()?.requestLock();
  },
  setSelectedMap: (selectedMap) => {
    const current = get();
    const candidates = current.selectedMode === "campaign" && selectedMap === "bedroom"
      ? [...STAGES.map((stage) => stage.id), ...missionsFor(selectedMap, current.selectedMode).map((mission) => mission.id)]
      : missionsFor(selectedMap, current.selectedMode).map((mission) => mission.id);
    const selectedMissionId = candidates.includes(current.selectedMissionId ?? "") ? current.selectedMissionId : (candidates[0] ?? null);
    bridge()?.setMap(selectedMap);
    bridge()?.setGameMode(current.selectedMode);
    set({ selectedMap, selectedMissionId, missionRuntime: null, mapSelectOpen: false, stageSummaryOpen: false, missionCompleteOpen: false, paused: false });
    bridge()?.setPaused(false);
    if (current.started) bridge()?.requestLock();
    persist(get());
  },
  setSelectedMode: (selectedMode) => {
    const current = get();
    const candidates = selectedMode === "campaign" && current.selectedMap === "bedroom"
      ? [...STAGES.map((stage) => stage.id), ...missionsFor(current.selectedMap, selectedMode).map((mission) => mission.id)]
      : missionsFor(current.selectedMap, selectedMode).map((mission) => mission.id);
    const selectedMissionId = candidates[0] ?? null;
    set({ selectedMode, selectedMissionId, missionRuntime: null, stageSummaryOpen: false, missionCompleteOpen: false });
    bridge()?.setGameMode(selectedMode);
    persist(get());
  },
  setSelectedMission: (selectedMissionId) => { set({ selectedMissionId, missionRuntime: null, stageSummaryOpen: false, missionCompleteOpen: false }); persist(get()); },
  restartMission: () => {
    const current = get();
    const mission = MISSIONS.find((item) => item.id === current.selectedMissionId);
    bridge()?.reset();
    set({ missionRuntime: mission ? createMissionRuntime(mission, current.snapshot) : null, missionCompleteOpen: false, paused: false });
    bridge()?.setPaused(false);
    bridge()?.requestLock();
  },
  continueMission: () => {
    const current = get();
    const list = missionsFor(current.selectedMap, current.selectedMode);
    const index = list.findIndex((mission) => mission.id === current.selectedMissionId);
    const next = list.slice(index + 1).find((mission) => missionUnlocked(mission, current.completedMissions, current.completedStages));
    if (!next) {
      set({ missionCompleteOpen: false, paused: false });
      bridge()?.setPaused(false); bridge()?.requestLock();
      return;
    }
    bridge()?.reset();
    set({ selectedMissionId: next.id, missionRuntime: createMissionRuntime(next, current.snapshot), missionCompleteOpen: false, paused: false });
    bridge()?.setPaused(false); bridge()?.requestLock();
    persist(get());
  },
  closeMissionSummary: () => set({ missionCompleteOpen: false }),
  toggleDebug: () => { const debugOpen = !get().debugOpen; set({ debugOpen }); bridge()?.setDebug(debugOpen); },
  setPaused: (paused) => { set({ paused }); bridge()?.setPaused(paused); },
  setTimeScale: (timeScale) => { set({ timeScale }); bridge()?.setTimeScale(timeScale); },
  resetSimulation: () => {
    const current = get();
    const legacyIndex = current.selectedMode === "campaign" && current.selectedMap === "bedroom"
      ? STAGES.findIndex((stage) => stage.id === current.selectedMissionId) : -1;
    const customMission = MISSIONS.find((mission) => mission.id === current.selectedMissionId);
    bridge()?.reset();
    const progression = legacyIndex >= 0 ? createProgression(legacyIndex, current.snapshot) : current.progression;
    const missionRuntime = customMission ? createMissionRuntime(customMission, current.snapshot) : null;
    if (legacyIndex >= 0) bridge()?.setStage(legacyIndex);
    set({ progression, missionRuntime, stageSummaryOpen: false, missionCompleteOpen: false, paused: false });
    bridge()?.setPaused(false);
    bridge()?.requestLock();
  },
  applySnapshot: (snapshot) => {
    const current = get();
    const before = current.taskRuntime.completed.length;
    const taskRuntime = updateTasks(current.taskRuntime, snapshot);
    const humanPlayer = useMultiplayerStore.getState().role === "human-1";
    const legacyCampaign = current.selectedMode === "campaign" && current.selectedMap === "bedroom" && STAGES.some((stage) => stage.id === current.selectedMissionId);
    const progression = legacyCampaign && !humanPlayer
      ? updateProgression(current.progression, snapshot, current.settings.flightAssist)
      : current.progression;
    const justCompleted = legacyCampaign && progression.stageComplete && !current.progression.stageComplete;
    const foundSecrets = Array.from(new Set([...current.foundSecrets, ...snapshot.telemetry.secrets]));
    const stage = STAGES[progression.stageIndex]!;
    const completedStages = justCompleted && !current.completedStages.includes(stage.id)
      ? [...current.completedStages, stage.id]
      : current.completedStages;

    const customMission = MISSIONS.find((mission) => mission.id === current.selectedMissionId);
    const previousMissionRuntime = current.missionRuntime;
    const missionRuntime = customMission && !humanPlayer
      ? updateMissionRuntime(previousMissionRuntime && previousMissionRuntime.missionId === customMission.id ? previousMissionRuntime : createMissionRuntime(customMission, snapshot), customMission, snapshot)
      : previousMissionRuntime;
    const missionJustCompleted = !!customMission && !!missionRuntime?.complete && !previousMissionRuntime?.complete;
    const completedMissions = missionJustCompleted && !current.completedMissions.includes(customMission!.id)
      ? [...current.completedMissions, customMission!.id]
      : current.completedMissions;

    const newlyDone = legacyCampaign ? [...progression.objectiveDone, ...progression.optionalDone].find((id) =>
      !current.progression.objectiveDone.includes(id) && !current.progression.optionalDone.includes(id)) : undefined;
    const newSecret = foundSecrets.length > current.foundSecrets.length;
    const completedObjective = newlyDone ? stage.objectives.find((objective) => objective.id === newlyDone) : undefined;
    const notice = justCompleted
      ? `FASE CONCLUÍDA · ${stage.name}`
      : missionJustCompleted ? `MISSÃO CONCLUÍDA · ${customMission!.name}`
      : completedObjective
        ? `${completedObjective.optional ? "OBJETIVO OPCIONAL" : "OBJETIVO CONCLUÍDO"} · ${completedObjective.label}`
        : newSecret ? "SEGREDO DESCOBERTO" : current.notice;
    const noticeChanged = justCompleted || missionJustCompleted || !!completedObjective || newSecret;
    const previousTelemetry = current.snapshot.telemetry;
    const deltaFood = Math.max(0, snapshot.telemetry.foodInteractions - previousTelemetry.foodInteractions);
    const deltaEvades = Math.max(0, snapshot.telemetry.attacksEvaded - previousTelemetry.attacksEvaded);
    const deltaKeys = Math.max(0, snapshot.telemetry.keyboardPresses - previousTelemetry.keyboardPresses);
    const newlyFoundSecrets = Math.max(0, foundSecrets.length - current.foundSecrets.length);
    const newlyCompletedObjectives = legacyCampaign ? [...progression.objectiveDone, ...progression.optionalDone].filter((id) =>
      !current.progression.objectiveDone.includes(id) && !current.progression.optionalDone.includes(id)).length : 0;
    const earnedPoints = humanPlayer ? 0 : deltaFood * 2 + deltaEvades * 4 + deltaKeys + newlyFoundSecrets * 20 + newlyCompletedObjectives * 8 + (justCompleted || missionJustCompleted ? 50 : 0);
    const flyPoints = current.flyPoints + earnedPoints;
    let stageRecords = current.stageRecords;
    if (justCompleted) {
      const elapsed = Math.max(1, Math.round((performance.now() - progression.stageStartedAt) / 1000));
      const attacks = snapshot.telemetry.attacksEvaded - progression.stageStartCounters.attacksEvaded;
      const food = snapshot.telemetry.foodInteractions - progression.stageStartCounters.foodInteractions;
      const previous = current.stageRecords[stage.id];
      stageRecords = {
        ...current.stageRecords,
        [stage.id]: {
          bestTime: previous ? Math.min(previous.bestTime, elapsed) : elapsed,
          bestAttacksEvaded: Math.max(previous?.bestAttacksEvaded ?? 0, attacks),
          bestFood: Math.max(previous?.bestFood ?? 0, food),
          completions: (previous?.completions ?? 0) + 1,
        },
      };
    }
    if (justCompleted || missionJustCompleted) bridge()?.setPaused(true);
    set({
      snapshot, taskRuntime, progression, missionRuntime, foundSecrets, completedStages, completedMissions, stageRecords, notice, flyPoints,
      noticeSeq: noticeChanged ? current.noticeSeq + 1 : current.noticeSeq,
      stageSummaryOpen: justCompleted ? true : current.stageSummaryOpen,
      missionCompleteOpen: missionJustCompleted ? true : current.missionCompleteOpen,
      paused: justCompleted || missionJustCompleted ? true : current.paused,
      campaignComplete: completedStages.includes(STAGES[STAGES.length - 1]!.id),
    });
    if (taskRuntime.completed.length !== before || justCompleted || missionJustCompleted || foundSecrets.length !== current.foundSecrets.length || earnedPoints > 0) persist(get());
  },
  setModule: (id, value) => {
    const modules = { ...get().snapshot.modules, [id]: value };
    set({ snapshot: { ...get().snapshot, modules } });
    bridge()?.setModule(id, value);
    persist(get());
  },
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    bridge()?.applySettings(settings);
    persist(get());
  },
  bindControl: (action, code) => {
    const settings = { ...get().settings, bindings: { ...get().settings.bindings, [action]: code } };
    set({ settings });
    bridge()?.applySettings(settings);
    persist(get());
  },
  loadProfile: (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return;
    for (const module of BRAIN_MODULES) bridge()?.setModule(module, profile.modules[module]);
    set({ snapshot: { ...get().snapshot, modules: { ...profile.modules } } });
    persist(get());
  },
  saveProfile: (name) => {
    const clean = name.trim(); if (!clean) return;
    const profile: FlyProfile = { id: `profile-${Date.now()}`, name: clean, modules: { ...get().snapshot.modules } };
    set({ profiles: [...get().profiles, profile] });
    persist(get());
  },
  duplicateProfile: (id) => {
    const source = get().profiles.find((p) => p.id === id);
    if (!source) return;
    const copy: FlyProfile = { id: `profile-${Date.now()}`, name: `${source.name} - cópia`, modules: { ...source.modules } };
    set({ profiles: [...get().profiles, copy] });
    persist(get());
  },
  renameProfile: (id, name) => {
    const clean = name.trim();
    if (!clean) return;
    set({ profiles: get().profiles.map((p) => p.id === id && !p.builtIn ? { ...p, name: clean } : p) });
    persist(get());
  },
  deleteProfile: (id) => { set({ profiles: get().profiles.filter((p) => p.builtIn || p.id !== id) }); persist(get()); },
  resetProgress: () => {
    localStorage.removeItem(SAVE_KEY);
    const baseModules = fullModules();
    const baseSettings = { ...DEFAULT_SETTINGS, bindings: { ...DEFAULT_SETTINGS.bindings } };
    const baseSnapshot = { ...INITIAL_SNAPSHOT, modules: baseModules };
    set({
      selectedMap: "bedroom",
      selectedMode: "campaign",
      selectedMissionId: STAGES[0]!.id,
      missionRuntime: null,
      completedMissions: [],
      snapshot: baseSnapshot,
      settings: baseSettings,
      taskRuntime: { completed: [], sawThreat: false, previousHunger: INITIAL_SNAPSHOT.hunger },
      profiles: [...BUILTIN_PROFILES],
      progression: createProgression(0, baseSnapshot),
      completedStages: [],
      foundSecrets: [],
      stageRecords: {},
      stageSummaryOpen: false,
      missionCompleteOpen: false,
      campaignComplete: false,
      flyPoints: 0,
      notice: "PROGRESSO SOLO ZERADO",
      noticeSeq: get().noticeSeq + 1,
    });
  },
  restartStage: () => {
    bridge()?.reset();
    const progression = createProgression(get().progression.stageIndex, get().snapshot);
    bridge()?.setStage(progression.stageIndex);
    set({ progression, stageSummaryOpen: false, paused: false });
  },
  continueStage: () => {
    const current = get();
    const nextIndex = current.progression.stageIndex + 1;
    if (nextIndex >= STAGES.length) {
      const followUp = missionsFor("bedroom", "campaign").find((mission) => missionUnlocked(mission, current.completedMissions, current.completedStages));
      if (followUp) {
        bridge()?.reset();
        bridge()?.setGameMode("campaign");
        bridge()?.setStage(STAGES.length - 1);
        set({ selectedMissionId: followUp.id, missionRuntime: createMissionRuntime(followUp, current.snapshot), stageSummaryOpen: false, campaignComplete: true, paused: false });
        bridge()?.setPaused(false); bridge()?.requestLock();
      } else {
        bridge()?.setPaused(false);
        set({ stageSummaryOpen: false, campaignComplete: true, paused: false });
      }
      persist(get());
      return;
    }
    bridge()?.reset();
    const progression = createProgression(nextIndex, current.snapshot);
    bridge()?.setStage(nextIndex);
    set({ progression, selectedMissionId: STAGES[nextIndex]!.id, stageSummaryOpen: false, paused: false });
    persist(get());
  },
  closeStageSummary: () => set({ stageSummaryOpen: false }),
  clearNotice: () => set({ notice: null }),
  buyUpgrade: (id) => {
    const current = get();
    const spec = FLY_UPGRADES[id];
    const level = id === "platinum" ? (current.settings.flySkin === "platinum" ? 1 : 0)
      : id === "armor" ? current.settings.upgradeArmor
      : id === "wings" ? current.settings.upgradeWings
      : id === "reflexes" ? current.settings.upgradeReflexes
      : current.settings.upgradeMetabolism;
    if (level >= spec.max) return false;
    const cost = upgradeCost(id, current.settings);
    if (current.flyPoints < cost) return false;
    const patch: Partial<GameSettings> = id === "platinum" ? { flySkin: "platinum" }
      : id === "armor" ? { upgradeArmor: current.settings.upgradeArmor + 1 }
      : id === "wings" ? { upgradeWings: current.settings.upgradeWings + 1 }
      : id === "reflexes" ? { upgradeReflexes: current.settings.upgradeReflexes + 1 }
      : { upgradeMetabolism: current.settings.upgradeMetabolism + 1 };
    const settings = { ...current.settings, ...patch };
    set({ settings, flyPoints: current.flyPoints - cost, notice: `${spec.name} adquirido`, noticeSeq: current.noticeSeq + 1 });
    bridge()?.applySettings(settings);
    persist(get());
    return true;
  },
}));

export { BRAIN_MODULES, TASKS, STAGES };
