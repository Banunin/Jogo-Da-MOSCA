import type { ControlAction, GameSettings } from "./types";

export const CONTROL_LABELS: Record<ControlAction, string> = {
  forward: "Avançar",
  back: "Recuar",
  left: "Mover à esquerda",
  right: "Mover à direita",
  ascend: "Subir",
  descend: "Descer",
  boost: "Acelerar",
  bankLeft: "Inclinar à esquerda",
  bankRight: "Inclinar à direita",
  land: "Pousar",
  interact: "Interagir / comer",
  laboratory: "Abrir configurações / laboratório",
};

export const DEFAULT_SETTINGS: GameSettings = {
  bindings: {
    forward: "KeyW",
    back: "KeyS",
    left: "KeyA",
    right: "KeyD",
    ascend: "Space",
    descend: "ControlLeft",
    boost: "ShiftLeft",
    bankLeft: "KeyQ",
    bankRight: "KeyE",
    land: "KeyR",
    interact: "KeyF",
    laboratory: "Tab",
  },
  invertY: false,
  sensitivity: 0.0022,
  speed: 1,
  acceleration: 1,
  flightAssist: true,
  cameraIntensity: 0.65,
  thirdPersonDistance: 2.9,
  thirdPersonHeight: 0.92,
  difficulty: "normal",
  shadows: true,
  particles: true,
  renderDistance: 32,
  renderScale: 1.1,
  exposure: 1.18,
  maxHp: 100,
  damageMultiplier: 1,
  playerFlyScale: 0.82,
  ambientFlyScale: 0.58,
  ambientFlySpeed: 1.22,
  ambientFlyAgility: 1.28,
  masterVolume: 1,
  effectsVolume: 1,
  buzzVolume: 0.9,
  aiIntelligence: 1.0,
  upgradeArmor: 0,
  upgradeWings: 0,
  upgradeReflexes: 0,
  upgradeMetabolism: 0,
  flySkin: "classic",
};

export type ControlPresetId = "default" | "precise" | "easy" | "custom";

export const CONTROL_PRESETS: Record<Exclude<ControlPresetId, "custom">, Partial<GameSettings>> = {
  default: { sensitivity: 0.0022, speed: 1, acceleration: 1, flightAssist: true, cameraIntensity: 0.65, thirdPersonDistance: 3.4, thirdPersonHeight: 1.05, invertY: false },
  precise: { sensitivity: 0.0015, speed: 0.82, acceleration: 0.78, flightAssist: true, cameraIntensity: 0.35, thirdPersonDistance: 3.15, thirdPersonHeight: 1.0, invertY: false },
  easy: { sensitivity: 0.0018, speed: 0.9, acceleration: 0.88, flightAssist: true, cameraIntensity: 0.22, thirdPersonDistance: 3.3, thirdPersonHeight: 1.05, invertY: false, difficulty: "easy" },
};

export function keyName(code: string): string {
  if (code === "Space") return "Espaço";
  if (code === "ControlLeft") return "Ctrl";
  if (code === "ShiftLeft") return "Shift";
  if (code === "Tab") return "Tab";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code.replace("Arrow", "Seta ");
}
