export const BRAIN_MODULES = [
  "vision",
  "perception",
  "reflexes",
  "balance",
  "motor",
  "flight",
  "navigation",
  "memory",
  "attention",
  "feeding",
  "fear",
  "consciousness",
] as const;

export type BrainModuleId = (typeof BRAIN_MODULES)[number];

export const MODULE_LABELS: Record<BrainModuleId, string> = {
  vision: "Visão",
  perception: "Percepção",
  reflexes: "Reflexos",
  balance: "Equilíbrio",
  motor: "Controle motor",
  flight: "Controle de voo",
  navigation: "Navegação",
  memory: "Memória",
  attention: "Atenção",
  feeding: "Alimentação",
  fear: "Medo / Fuga",
  consciousness: "Consciência",
};

export type FlyState =
  | "EXPLORANDO"
  | "PROCURANDO_COMIDA"
  | "COMENDO"
  | "DESCANSANDO"
  | "ALERTA"
  | "FUGINDO"
  | "PERSEGUINDO"
  | "DESORIENTADA"
  | "POUSADA"
  | "VOANDO";

export const STATE_LABELS: Record<FlyState, string> = {
  EXPLORANDO: "Explorando",
  PROCURANDO_COMIDA: "Procurando comida",
  COMENDO: "Comendo",
  DESCANSANDO: "Descansando",
  ALERTA: "Alerta",
  FUGINDO: "Fugindo",
  PERSEGUINDO: "Perseguindo",
  DESORIENTADA: "Desorientada",
  POUSADA: "Pousada",
  VOANDO: "Voando",
};

export type EntityKind =
  | "player"
  | "fly"
  | "food"
  | "spider"
  | "human"
  | "fan"
  | "water"
  | "fire"
  | "vacuum"
  | "obstacle";

export const KIND_LABELS: Record<EntityKind, string> = {
  player: "Você",
  fly: "Mosca",
  food: "Comida",
  spider: "Aranha",
  human: "Humano",
  fan: "Ventilador",
  water: "Água",
  fire: "Fogo",
  vacuum: "Aspirador",
  obstacle: "Obstáculo",
};

export type MemoryKind = "safe" | "food" | "danger";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Needs {
  hunger: number;
  energy: number;
  fear: number;
  curiosity: number;
  stress: number;
}

export interface MemoryTrace {
  id: string;
  kind: MemoryKind;
  x: number;
  y: number;
  z: number;
  strength: number;
  age: number;
}

export interface Perception {
  id: string;
  kind: EntityKind;
  label: string;
  distance: number;
  motion: number;
  danger: number;
  x: number;
  y: number;
  z: number;
}

export interface Personality {
  id: string;
  name: string;
  bold: number;
  greedy: number;
  curious: number;
  stamina: number;
}

export interface BoxCollider {
  minx: number;
  miny: number;
  minz: number;
  maxx: number;
  maxy: number;
  maxz: number;
  landable: boolean;
  kind: string;
}

export interface SnapshotEntity {
  id: string;
  kind: EntityKind;
  x: number;
  y: number;
  z: number;
}

export interface GameSnapshot {
  hp: number;
  maxHp: number;
  dead: boolean;
  hunger: number;
  energy: number;
  fear: number;
  curiosity: number;
  stress: number;
  state: FlyState;
  flying: boolean;
  landed: boolean;
  modules: Record<BrainModuleId, number>;
  memories: MemoryTrace[];
  perceptions: Perception[];
  thought: string;
  entities: SnapshotEntity[];
  player: { x: number; y: number; z: number; yaw: number; pitch: number; speed: number };
  windDetected: boolean;
  compensating: boolean;
  destination: { x: number; y: number; z: number; label: string } | null;
  detected: Perception | null;
  pipeline: {
    vision: boolean;
    perception: boolean;
    memory: boolean;
    consciousness: boolean;
    decision: boolean;
    motor: boolean;
  };
  event: string | null;
  humans: HumanSnapshot[];
  telemetry: SimulationTelemetry;
  rareEvent: string | null;
  observerTargetLabel: string | null;
}

export type HumanState = "IDLE" | "WALKING" | "WORKING" | "SITTING" | "SLEEPING" | "TYPING" | "USING_MOUSE" | "STANDING_UP" | "SITTING_DOWN" | "LOOKING" | "NOTICE_FLY" | "ANNOYED" | "ATTACKING" | "SEARCHING" | "GIVING_UP" | "LEAVING";

export type HumanPersonalityId = "indifferent" | "annoyed" | "aggressive" | "distracted" | "careful" | "quitter";

export interface HumanSnapshot {
  id: string;
  state: HumanState;
  personality: HumanPersonalityId;
  label: string;
  attempts: number;
  lastResult: "hit" | "miss" | null;
  anger: number;
  raging: boolean;
  blinking: boolean;
}

export interface SimulationTelemetry {
  foodInteractions: number;
  landings: number;
  flightDistance: number;
  humanNotices: number;
  humanSwats: number;
  humanHits: number;
  humanMisses: number;
  predatorEncounters: number;
  predatorEscapes: number;
  predatorHits: number;
  windSeconds: number;
  rareEvents: number;
  secrets: string[];
  visitedZones: string[];
  landedSurfaces: string[];
  hideoutsFound: string[];
  monitorLandings: number;
  keyboardLandings: number;
  screenCrossings: number;
  faceFlybys: number;
  humanProvocations: number;
  attacksEvaded: number;
  swatterAttacks: number;
  coverEscapes: number;
  humanStoodUp: number;
  humanLeftComputer: number;
  windowVisits: number;
  gapPasses: number;
  hiddenFoodFound: number;
  safeReturns: number;
  stealthMeals: number;
  nearHumanSeconds: number;
  keyboardPresses: number;
  doorEvents: number;
  windowEvents: number;
  ambientHumanActions: number;
}

export type CameraMode = "first" | "third" | "observation";

export type ControlAction =
  | "forward"
  | "back"
  | "left"
  | "right"
  | "ascend"
  | "descend"
  | "boost"
  | "bankLeft"
  | "bankRight"
  | "land"
  | "interact"
  | "laboratory";

export type ControlBindings = Record<ControlAction, string>;

export interface GameSettings {
  bindings: ControlBindings;
  invertY: boolean;
  sensitivity: number;
  speed: number;
  acceleration: number;
  flightAssist: boolean;
  cameraIntensity: number;
  thirdPersonDistance: number;
  thirdPersonHeight: number;
  difficulty: "easy" | "normal" | "hard";
  shadows: boolean;
  particles: boolean;
  renderDistance: number;
  renderScale: number;
  exposure: number;
  maxHp: number;
  damageMultiplier: number;
  playerFlyScale: number;
  ambientFlyScale: number;
  ambientFlySpeed: number;
  ambientFlyAgility: number;
  masterVolume: number;
  effectsVolume: number;
  buzzVolume: number;
  aiIntelligence: number;
  upgradeArmor: number;
  upgradeWings: number;
  upgradeReflexes: number;
  upgradeMetabolism: number;
  flySkin: "classic" | "platinum";
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getPosition: () => { x: number; y: number; z: number };
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

export {};
