import type { GameSnapshot, SimulationTelemetry } from "./types";

export type MissionType = "exploration" | "survival" | "feeding" | "escape" | "precision" | "brain" | "memory" | "observation" | "challenge";

export interface StageObjective {
  id: string;
  label: string;
  description: string;
  optional?: boolean;
}

export interface StageDefinition {
  id: string;
  number: number;
  name: string;
  type: MissionType;
  intro: string;
  mechanics: string[];
  dangers: string[];
  objectives: StageObjective[];
  completion: string;
}

export const STAGES: StageDefinition[] = [
  {
    id: "first-flight", number: 1, name: "Primeiro voo", type: "exploration",
    intro: "O quarto é gigantesco na escala de uma mosca. Aprenda a se mover, pousar e reconhecer rotas seguras.",
    mechanics: ["voo", "pouso", "exploração vertical", "alimentação"], dangers: ["quedas", "obstáculos"],
    objectives: [
      { id: "explore-room", label: "Explore o quarto", description: "Voe pelo ambiente e percorra uma distância significativa." },
      { id: "land-variety", label: "Teste superfícies", description: "Pouse em três superfícies diferentes." },
      { id: "eat", label: "Encontre alimento", description: "Localize e consuma uma fonte de alimento." },
      { id: "safe-return", label: "Volte a um ponto seguro", description: "Depois de explorar, alcance uma área segura." },
      { id: "hideout", label: "Ache um esconderijo", description: "Descubra um lugar onde o humano teria dificuldade para alcançar você.", optional: true },
      { id: "visit-window", label: "Visite a janela", description: "Alcance o parapeito e observe o quarto de outro ponto.", optional: true },
      { id: "land-five", label: "Cinco superfícies", description: "Pouse em cinco superfícies diferentes do quarto.", optional: true },
    ],
    completion: "Você já consegue ler o quarto como uma mosca: rotas, superfícies, comida e abrigo.",
  },
  {
    id: "feeding-time", number: 2, name: "Hora de comer", type: "feeding",
    intro: "Comida vale energia, mas permanecer exposto é um risco. Aproxime-se, coma e saia da área.",
    mechanics: ["fontes de alimento", "aproximação discreta", "energia"], dangers: ["exposição"],
    objectives: [
      { id: "see-food", label: "Localize comida", description: "Detecte uma fonte de alimento no ambiente." },
      { id: "stealth-meal", label: "Coma sem chamar atenção", description: "Alimente-se enquanto nenhum humano estiver vendo você." },
      { id: "meal-escape", label: "Saia da área", description: "Afaste-se depois da refeição em vez de ficar vulnerável." },
      { id: "hidden-food", label: "Migalha escondida", description: "Encontre a fonte de alimento escondida do quarto.", optional: true },
      { id: "clean-meal", label: "Refeição perfeita", description: "Coma e se afaste sem receber nenhum golpe humano.", optional: true },
    ],
    completion: "Você aprendeu que conseguir comida é apenas metade do problema; sair vivo é a outra metade.",
  },
  {
    id: "dont-get-caught", number: 3, name: "Não deixe ele te pegar", type: "escape",
    intro: "O dono do quarto passa a reagir. Provoque-o o suficiente para aprender como ele percebe e ataca.",
    mechanics: ["percepção humana", "provocação", "estapadas", "fuga"], dangers: ["mão humana"],
    objectives: [
      { id: "provoke", label: "Incomode o humano", description: "Passe perto do rosto ou ocupe a área do computador até ele reagir." },
      { id: "evade-three", label: "Escape de três ataques", description: "Faça o humano errar três tentativas de golpe." },
      { id: "survive-human", label: "Continue inteiro", description: "Complete a provocação e permaneça ativo mesmo sob pressão." },
      { id: "stand-up", label: "Tire-o da cadeira", description: "Faça o humano levantar durante a confusão.", optional: true },
      { id: "clean-dodges", label: "Sem tocar em você", description: "Escape dos três ataques sem sofrer um acerto.", optional: true },
    ],
    completion: "Agora você conhece o ritmo do humano: perceber, reagir, preparar o golpe e procurar.",
  },
  {
    id: "computer", number: 4, name: "O computador", type: "challenge",
    intro: "O computador é território valioso e perigoso. Use monitor, teclado e o rosto do humano para criar uma rota de provocação.",
    mechanics: ["monitor", "teclado", "tráfego diante da tela", "rosto humano"], dangers: ["humano irritado"],
    objectives: [
      { id: "monitor", label: "Pouse no monitor", description: "Use a grande superfície luminosa como ponto de pouso." },
      { id: "keyboard", label: "Pouse no teclado", description: "Desça entre as teclas do computador." },
      { id: "screen-cross", label: "Atravesse a tela", description: "Cruze a frente do monitor em voo." },
      { id: "face-flyby", label: "Passe pelo rosto", description: "Voe perto do rosto do humano e saia rapidamente." },
      { id: "computer-return", label: "Volte ao computador", description: "Depois da provocação, retorne ao monitor para fechar a rota." },
      { id: "leave-computer", label: "Faça-o abandonar o PC", description: "Faça o humano interromper o que estava fazendo por sua causa.", optional: true },
      { id: "press-key", label: "Pressione uma tecla", description: "Pouse no teclado e use F para realmente afundar uma tecla.", optional: true },
    ],
    completion: "O computador deixou de ser cenário: virou território, provocação e rota de fuga.",
  },
  {
    id: "swatter", number: 5, name: "A raquete", type: "escape",
    intro: "A paciência acabou. O humano agora usa um mata-moscas com mais alcance, mas ainda precisa prever onde você estará.",
    mechanics: ["mata-moscas", "previsão de ataque", "cobertura", "última posição conhecida"], dangers: ["golpes de maior alcance"],
    objectives: [
      { id: "swatter-seen", label: "Force a raquete", description: "Provoque o humano até ele usar o mata-moscas." },
      { id: "swatter-evade", label: "Escape de três golpes", description: "Desvie de três ataques durante a fase da raquete." },
      { id: "use-cover", label: "Use o quarto como escudo", description: "Quebre um ataque usando monitor, cama, mesa ou outro esconderijo." },
      { id: "survive-swatter", label: "Sobreviva", description: "Conclua a sequência da raquete e continue em condições de fuga." },
      { id: "gap", label: "Fuga por uma fresta", description: "Atravesse uma fresta que o humano não consegue usar.", optional: true },
    ],
    completion: "Voar para longe não é a única defesa. O próprio quarto agora faz parte da estratégia.",
  },
  {
    id: "hunger-danger", number: 6, name: "Fome e perigo", type: "survival",
    intro: "Agora os sistemas se combinam. Você precisa comer, preservar energia, conviver com o humano e escolher quando se esconder.",
    mechanics: ["fome", "energia", "humano", "locais seguros", "exploração"], dangers: ["exposição prolongada", "ataques", "fome"],
    objectives: [
      { id: "eat", label: "Reponha energia", description: "Encontre e consuma alimento." },
      { id: "near-human", label: "Viva perigosamente", description: "Permaneça próximo ao humano por alguns segundos sem ser atingido." },
      { id: "evade-two", label: "Leia os ataques", description: "Escape de pelo menos dois golpes." },
      { id: "safe-return", label: "Encontre segurança", description: "Retorne a uma área segura depois de se expor." },
      { id: "secret", label: "Descubra algo escondido", description: "Encontre um segredo do quarto.", optional: true },
    ],
    completion: "Você deixou de apenas pilotar uma mosca e começou a tomar decisões como uma.",
  },
];

function cloneTelemetry(t: SimulationTelemetry): SimulationTelemetry {
  return {
    ...t,
    secrets: [...t.secrets],
    visitedZones: [...t.visitedZones],
    landedSurfaces: [...t.landedSurfaces],
    hideoutsFound: [...t.hideoutsFound],
  };
}

export interface ProgressionRuntime {
  stageIndex: number;
  stageStartedAt: number;
  objectiveDone: string[];
  optionalDone: string[];
  stageStartCounters: SimulationTelemetry;
  humanStates: string[];
  maxFear: number;
  stealthMealDistanceBaseline: number | null;
  faceFlybyMonitorBaseline: number | null;
  stageComplete: boolean;
}

export function createProgression(stageIndex: number, snapshot: GameSnapshot): ProgressionRuntime {
  return {
    stageIndex,
    stageStartedAt: performance.now(),
    objectiveDone: [],
    optionalDone: [],
    stageStartCounters: cloneTelemetry(snapshot.telemetry),
    humanStates: [],
    maxFear: snapshot.fear,
    stealthMealDistanceBaseline: null,
    faceFlybyMonitorBaseline: null,
    stageComplete: false,
  };
}

function newUnique(current: string[], base: string[]): number {
  const before = new Set(base);
  return current.filter((id) => !before.has(id)).length;
}

export function updateProgression(runtime: ProgressionRuntime, snapshot: GameSnapshot, _flightAssist: boolean): ProgressionRuntime {
  const stage = STAGES[runtime.stageIndex] ?? STAGES[STAGES.length - 1]!;
  const next: ProgressionRuntime = {
    ...runtime,
    objectiveDone: [...runtime.objectiveDone],
    optionalDone: [...runtime.optionalDone],
    humanStates: [...runtime.humanStates],
  };
  const base = runtime.stageStartCounters;
  const t = snapshot.telemetry;
  const mark = (id: string, optional = false) => {
    const bucket = optional ? next.optionalDone : next.objectiveDone;
    if (!bucket.includes(id)) bucket.push(id);
  };

  next.maxFear = Math.max(next.maxFear, snapshot.fear);
  for (const h of snapshot.humans) if (!next.humanStates.includes(h.state)) next.humanStates.push(h.state);
  if (t.stealthMeals > base.stealthMeals && next.stealthMealDistanceBaseline === null) {
    next.stealthMealDistanceBaseline = t.flightDistance;
  }
  if (t.faceFlybys > base.faceFlybys && next.faceFlybyMonitorBaseline === null) {
    next.faceFlybyMonitorBaseline = t.monitorLandings;
  }

  const surfaceDelta = newUnique(t.landedSurfaces, base.landedSurfaces);
  const hideoutDelta = newUnique(t.hideoutsFound, base.hideoutsFound);
  const elapsed = (performance.now() - next.stageStartedAt) / 1000;

  for (const obj of stage.objectives) {
    let done = false;
    switch (obj.id) {
      case "explore-room": done = t.flightDistance - base.flightDistance >= 18 && t.visitedZones.length - base.visitedZones.length >= 2; break;
      case "land-variety": done = surfaceDelta >= 3; break;
      case "eat": done = t.foodInteractions > base.foodInteractions; break;
      case "safe-return": done = t.safeReturns > base.safeReturns; break;
      case "hideout": done = hideoutDelta > 0; break;
      case "visit-window": done = t.windowVisits > base.windowVisits; break;
      case "land-five": done = surfaceDelta >= 5; break;
      case "see-food": done = snapshot.perceptions.some((p) => p.kind === "food") || t.foodInteractions > base.foodInteractions; break;
      case "stealth-meal": done = t.stealthMeals > base.stealthMeals; break;
      case "meal-escape": done = next.stealthMealDistanceBaseline !== null && t.flightDistance - next.stealthMealDistanceBaseline >= 3; break;
      case "hidden-food": done = t.hiddenFoodFound > base.hiddenFoodFound; break;
      case "clean-meal": done = t.stealthMeals > base.stealthMeals && t.humanHits === base.humanHits && next.stealthMealDistanceBaseline !== null && t.flightDistance - next.stealthMealDistanceBaseline >= 3; break;
      case "provoke": done = t.humanProvocations > base.humanProvocations && t.humanNotices > base.humanNotices; break;
      case "evade-three": done = t.attacksEvaded - base.attacksEvaded >= 3; break;
      case "survive-human": done = next.objectiveDone.includes("provoke") && next.objectiveDone.includes("evade-three"); break;
      case "stand-up": done = t.humanStoodUp > base.humanStoodUp; break;
      case "clean-dodges": done = t.attacksEvaded - base.attacksEvaded >= 3 && t.humanHits === base.humanHits; break;
      case "monitor": done = t.monitorLandings > base.monitorLandings; break;
      case "keyboard": done = t.keyboardLandings > base.keyboardLandings; break;
      case "screen-cross": done = t.screenCrossings > base.screenCrossings; break;
      case "face-flyby": done = t.faceFlybys > base.faceFlybys; break;
      case "computer-return": done = next.faceFlybyMonitorBaseline !== null && t.monitorLandings > next.faceFlybyMonitorBaseline; break;
      case "leave-computer": done = t.humanLeftComputer > base.humanLeftComputer; break;
      case "press-key": done = t.keyboardPresses > base.keyboardPresses; break;
      case "swatter-seen": done = t.swatterAttacks > base.swatterAttacks; break;
      case "swatter-evade": done = t.swatterAttacks - base.swatterAttacks >= 3 && t.attacksEvaded - base.attacksEvaded >= 3; break;
      case "use-cover": done = t.coverEscapes > base.coverEscapes; break;
      case "survive-swatter": done = next.objectiveDone.includes("swatter-seen") && next.objectiveDone.includes("swatter-evade") && next.objectiveDone.includes("use-cover"); break;
      case "gap": done = t.gapPasses > base.gapPasses; break;
      case "near-human": done = t.nearHumanSeconds - base.nearHumanSeconds >= 6; break;
      case "evade-two": done = t.attacksEvaded - base.attacksEvaded >= 2; break;
      case "secret": done = t.secrets.length > base.secrets.length; break;
      case "survive": done = elapsed >= 45; break;
    }
    if (done) mark(obj.id, !!obj.optional);
  }

  next.stageComplete = stage.objectives.filter((o) => !o.optional).every((o) => next.objectiveDone.includes(o.id));
  return next;
}
