import type { GameSnapshot, SimulationTelemetry } from "./types";
import type { MapId } from "./maps";

export type GameModeId = "campaign" | "exploration" | "survival" | "challenge" | "multiplayer" | "laboratory";

export interface GameModeDefinition {
  id: GameModeId;
  name: string;
  description: string;
  danger: "Baixo" | "Médio" | "Alto" | "Variável";
}

export const GAME_MODES: GameModeDefinition[] = [
  { id: "campaign", name: "Campanha / Missões", description: "Fases encadeadas, objetivos e desbloqueios.", danger: "Variável" },
  { id: "exploration", name: "Exploração", description: "Conheça o mapa, descubra rotas, comida e segredos com pressão reduzida.", danger: "Baixo" },
  { id: "survival", name: "Sobrevivência", description: "Fome, perigos e NPCs ativos. Aguente o máximo possível cumprindo metas.", danger: "Alto" },
  { id: "challenge", name: "Desafio", description: "Objetivos curtos, exigentes e repetíveis para testar domínio do voo.", danger: "Alto" },
  { id: "multiplayer", name: "Multiplayer", description: "Sala online privada com papéis sincronizados e anfitrião definido ao criar a sessão.", danger: "Variável" },
  { id: "laboratory", name: "Laboratório / Observação", description: "Ambiente controlado para observar IA, memória e comportamento.", danger: "Baixo" },
];

export type MissionMetric =
  | "flightDistance" | "landings" | "uniqueLandings" | "foodInteractions" | "attacksEvaded"
  | "coverEscapes" | "safeReturns" | "secrets" | "visitedZones" | "hideoutsFound"
  | "windSeconds" | "rareEvents" | "nearHumanSeconds" | "keyboardPresses" | "humanProvocations"
  | "monitorLandings" | "screenCrossings" | "windowVisits" | "predatorEscapes" | "humanMisses"
  | "elapsedSeconds" | "memories" | "perceptions";

export interface MissionObjectiveDefinition {
  id: string;
  label: string;
  description: string;
  metric: MissionMetric;
  target: number;
}

export interface MissionDefinition {
  id: string;
  mapId: MapId;
  mode: Exclude<GameModeId, "multiplayer">;
  order: number;
  name: string;
  description: string;
  objectives: MissionObjectiveDefinition[];
  unlockAfter?: string;
}

const o = (id: string, label: string, description: string, metric: MissionMetric, target: number): MissionObjectiveDefinition => ({ id, label, description, metric, target });

export const MISSIONS: MissionDefinition[] = [
  { id: "bed-camp-night-route", mapId: "bedroom", mode: "campaign", order: 7, name: "Rota da madrugada", description: "Cruze o quarto sem depender de um único ponto de interesse.", unlockAfter: "hunger-danger", objectives: [o("distance","Patrulha aérea","Percorra 34 m pelo quarto.","flightDistance",34),o("surfaces","Pousos variados","Pouse em quatro superfícies diferentes.","uniqueLandings",4),o("cover","Use cobertura","Escape de um ataque usando cobertura.","coverEscapes",1)] },
  { id: "bed-camp-owner-routine", mapId: "bedroom", mode: "campaign", order: 8, name: "A rotina do dono", description: "Manipule o comportamento do humano em vez de apenas chegar a um marcador.", unlockAfter: "bed-camp-night-route", objectives: [o("provoke","Mude a rotina","Provoque o humano três vezes.","humanProvocations",3),o("evade","Faça-o errar","Escape de quatro ataques.","attacksEvaded",4),o("window","Use a janela","Visite a região da janela duas vezes.","windowVisits",2)] },

  { id: "kit-camp-first-taste", mapId: "kitchen", mode: "campaign", order: 1, name: "Primeiro gosto", description: "Aprenda a sobreviver onde comida e perigo ocupam o mesmo espaço.", objectives: [o("food","Prove duas fontes","Alimente-se duas vezes.","foodInteractions",2),o("wind","Leia o vento","Permaneça oito segundos em corrente de ar.","windSeconds",8),o("zones","Mapeie a bancada","Visite três zonas diferentes.","visitedZones",3)] },
  { id: "kit-camp-hot-side", mapId: "kitchen", mode: "campaign", order: 2, name: "Lado quente", description: "Use velocidade e leitura ambiental para atravessar a área de risco.", unlockAfter: "kit-camp-first-taste", objectives: [o("distance","Atravesse a cozinha","Voe 42 m.","flightDistance",42),o("safe","Recupere-se","Retorne duas vezes a áreas seguras.","safeReturns",2),o("secret","Ache algo escondido","Descubra um segredo.","secrets",1)] },
  { id: "kit-camp-pressure", mapId: "kitchen", mode: "campaign", order: 3, name: "Pressão constante", description: "Comida, humano e predador pressionam ao mesmo tempo.", unlockAfter: "kit-camp-hot-side", objectives: [o("food","Coma sob pressão","Alimente-se três vezes.","foodInteractions",3),o("evade","Leia o humano","Escape de três ataques.","attacksEvaded",3),o("predator","Escape do predador","Registre uma fuga de predador.","predatorEscapes",1)] },

  { id: "gar-camp-open-air", mapId: "garden", mode: "campaign", order: 1, name: "Céu aberto", description: "Aprenda a usar altura e vegetação em um mapa sem paredes próximas.", objectives: [o("distance","Voo longo","Percorra 48 m.","flightDistance",48),o("hide","Ache abrigo natural","Descubra dois esconderijos.","hideoutsFound",2),o("food","Busque néctar","Alimente-se duas vezes.","foodInteractions",2)] },
  { id: "gar-camp-territory", mapId: "garden", mode: "campaign", order: 2, name: "Território vivo", description: "O jardim exige leitura de criaturas e mudanças de rota.", unlockAfter: "gar-camp-open-air", objectives: [o("zones","Explore o terreno","Visite quatro zonas.","visitedZones",4),o("predator","Fuja da aranha","Escape uma vez de predador.","predatorEscapes",1),o("land","Pouse com precisão","Realize cinco pousos.","landings",5)] },
  { id: "gar-camp-long-day", mapId: "garden", mode: "campaign", order: 3, name: "Dia longo", description: "Uma missão de resistência com objetivos distribuídos ao longo da partida.", unlockAfter: "gar-camp-territory", objectives: [o("time","Permaneça ativa","Sobreviva por 90 segundos.","elapsedSeconds",90),o("food","Mantenha energia","Alimente-se três vezes.","foodInteractions",3),o("secret","Investigue","Descubra dois segredos.","secrets",2)] },

  { id: "bed-exp-cartography", mapId: "bedroom", mode: "exploration", order: 1, name: "Cartografia doméstica", description: "Construa uma leitura espacial do quarto por movimento e pousos.", objectives: [o("distance","Mapeie o ar","Percorra 40 m.","flightDistance",40),o("surfaces","Catalogue superfícies","Pouse em cinco superfícies diferentes.","uniqueLandings",5),o("zones","Descubra zonas","Visite quatro zonas.","visitedZones",4)] },
  { id: "bed-exp-hidden-life", mapId: "bedroom", mode: "exploration", order: 2, name: "Vida escondida", description: "Procure cobertura, segredos e memórias úteis.", unlockAfter: "bed-exp-cartography", objectives: [o("hide","Esconderijos","Encontre dois esconderijos.","hideoutsFound",2),o("secret","Segredos","Descubra dois segredos.","secrets",2),o("memory","Memórias","Mantenha três memórias ativas.","memories",3)] },
  { id: "kit-exp-pantry", mapId: "kitchen", mode: "exploration", order: 1, name: "Despensa viva", description: "Entenda onde estão os recursos antes de enfrentar a pressão total.", objectives: [o("food","Experimente comida","Alimente-se três vezes.","foodInteractions",3),o("zones","Mapeie a cozinha","Visite quatro zonas.","visitedZones",4),o("land","Pousos de inspeção","Faça quatro pousos.","landings",4)] },
  { id: "kit-exp-airflow", mapId: "kitchen", mode: "exploration", order: 2, name: "Correntes invisíveis", description: "Use o vento como informação, não como obstáculo aleatório.", unlockAfter: "kit-exp-pantry", objectives: [o("wind","Sinta a corrente","Passe 14 s sob vento.","windSeconds",14),o("distance","Compense em voo","Percorra 36 m.","flightDistance",36),o("safe","Retorne ao controle","Faça dois retornos seguros.","safeReturns",2)] },
  { id: "gar-exp-canopy", mapId: "garden", mode: "exploration", order: 1, name: "Entre folhas", description: "Explore verticalmente e use vegetação como referência.", objectives: [o("distance","Voo aberto","Percorra 52 m.","flightDistance",52),o("hide","Abrigos naturais","Encontre dois esconderijos.","hideoutsFound",2),o("zones","Varra o jardim","Visite quatro zonas.","visitedZones",4)] },
  { id: "gar-exp-nectar", mapId: "garden", mode: "exploration", order: 2, name: "Rota do néctar", description: "Crie uma rota de alimentação eficiente entre pousos seguros.", unlockAfter: "gar-exp-canopy", objectives: [o("food","Coleta","Alimente-se três vezes.","foodInteractions",3),o("safe","Voltas seguras","Retorne duas vezes a pontos seguros.","safeReturns",2),o("land","Precisão","Complete seis pousos.","landings",6)] },

  { id: "bed-surv-sixty", mapId: "bedroom", mode: "survival", order: 1, name: "Sessenta segundos", description: "Aguente um minuto com o humano ativo e continue tomando decisões.", objectives: [o("time","Sobreviva","Permaneça ativa por 60 s.","elapsedSeconds",60),o("evade","Evite golpes","Escape de três ataques.","attacksEvaded",3),o("food","Não fique sem energia","Alimente-se duas vezes.","foodInteractions",2)] },
  { id: "bed-surv-under-pressure", mapId: "bedroom", mode: "survival", order: 2, name: "Sob pressão", description: "Faça o humano errar repetidamente e use o cenário para sobreviver.", unlockAfter: "bed-surv-sixty", objectives: [o("evade","Cinco erros","Escape de cinco ataques.","attacksEvaded",5),o("cover","Cobertura real","Use cobertura duas vezes.","coverEscapes",2),o("near","Zona de risco","Permaneça oito segundos perto do humano.","nearHumanSeconds",8)] },
  { id: "kit-surv-hot-minute", mapId: "kitchen", mode: "survival", order: 1, name: "Minuto quente", description: "Mantenha-se viva enquanto vento e habitantes alteram suas rotas.", objectives: [o("time","Resista","Sobreviva por 70 s.","elapsedSeconds",70),o("wind","Vento","Acumule 12 s sob corrente.","windSeconds",12),o("food","Reabasteça","Alimente-se três vezes.","foodInteractions",3)] },
  { id: "kit-surv-hunted", mapId: "kitchen", mode: "survival", order: 2, name: "Caçada na cozinha", description: "Sobreviva a ameaças móveis e não permaneça numa única rota.", unlockAfter: "kit-surv-hot-minute", objectives: [o("predator","Fuga","Escape uma vez do predador.","predatorEscapes",1),o("evade","Humano","Escape de três ataques humanos.","attacksEvaded",3),o("distance","Continue móvel","Percorra 55 m.","flightDistance",55)] },
  { id: "gar-surv-open", mapId: "garden", mode: "survival", order: 1, name: "Sem teto", description: "O espaço aberto facilita o voo, mas também a detecção.", objectives: [o("time","Resista","Sobreviva por 75 s.","elapsedSeconds",75),o("predator","Predador","Escape de uma perseguição.","predatorEscapes",1),o("hide","Quebre linha de visão","Encontre dois esconderijos.","hideoutsFound",2)] },
  { id: "gar-surv-endurance", mapId: "garden", mode: "survival", order: 2, name: "Resistência", description: "Uma partida longa que exige alimentação e deslocamento contínuo.", unlockAfter: "gar-surv-open", objectives: [o("time","Dois minutos","Sobreviva por 120 s.","elapsedSeconds",120),o("food","Sustente-se","Alimente-se quatro vezes.","foodInteractions",4),o("distance","Não pare","Percorra 80 m.","flightDistance",80)] },

  { id: "bed-cha-computer", mapId: "bedroom", mode: "challenge", order: 1, name: "Circuito do computador", description: "Faça uma sequência técnica em torno do computador e do humano.", objectives: [o("monitor","Monitor","Pouse duas vezes no monitor.","monitorLandings",2),o("screen","Tela","Cruze a tela três vezes.","screenCrossings",3),o("keys","Teclas","Pressione duas teclas.","keyboardPresses",2)] },
  { id: "bed-cha-provocation", mapId: "bedroom", mode: "challenge", order: 2, name: "Provocador", description: "Faça o humano reagir e transforme cada ataque em oportunidade.", unlockAfter: "bed-cha-computer", objectives: [o("provoke","Provocações","Provoque quatro vezes.","humanProvocations",4),o("miss","Erros do humano","Force quatro erros.","humanMisses",4),o("cover","Final em cobertura","Escape usando cobertura uma vez.","coverEscapes",1)] },
  { id: "kit-cha-wind", mapId: "kitchen", mode: "challenge", order: 1, name: "Contra o vento", description: "Mantenha uma rota produtiva mesmo sob correntes de ar.", objectives: [o("wind","Exposição","Acumule 18 s sob vento.","windSeconds",18),o("food","Comida","Alimente-se duas vezes.","foodInteractions",2),o("distance","Distância","Percorra 46 m.","flightDistance",46)] },
  { id: "kit-cha-clean", mapId: "kitchen", mode: "challenge", order: 2, name: "Limpo e rápido", description: "Faça pousos, coma e continue em movimento.", unlockAfter: "kit-cha-wind", objectives: [o("land","Pousos","Faça oito pousos.","landings",8),o("food","Refeições","Alimente-se três vezes.","foodInteractions",3),o("safe","Saídas seguras","Faça três retornos seguros.","safeReturns",3)] },
  { id: "gar-cha-marathon", mapId: "garden", mode: "challenge", order: 1, name: "Maratona aérea", description: "Use o mapa aberto para manter velocidade e precisão por uma rota longa.", objectives: [o("distance","Maratona","Percorra 90 m.","flightDistance",90),o("land","Pousos","Faça seis pousos.","landings",6),o("food","Néctar","Alimente-se duas vezes.","foodInteractions",2)] },
  { id: "gar-cha-hunter", mapId: "garden", mode: "challenge", order: 2, name: "Predador à vista", description: "Entre na zona de perigo, sobreviva e volte a explorar.", unlockAfter: "gar-cha-marathon", objectives: [o("predator","Escape","Escape duas vezes de predador.","predatorEscapes",2),o("hide","Ocultação","Encontre dois esconderijos.","hideoutsFound",2),o("distance","Retome a rota","Percorra 45 m.","flightDistance",45)] },

  { id: "bed-lab-memory", mapId: "bedroom", mode: "laboratory", order: 1, name: "Memória espacial", description: "Observe o sistema cognitivo acumulando referências do ambiente.", objectives: [o("memory","Memórias ativas","Mantenha quatro memórias ativas.","memories",4),o("perception","Percepções","Tenha quatro estímulos simultâneos percebidos.","perceptions",4),o("zones","Contexto","Visite três zonas.","visitedZones",3)] },
  { id: "kit-lab-senses", mapId: "kitchen", mode: "laboratory", order: 1, name: "Sensores sob ruído", description: "Use comida, vento e movimento para observar percepção em ambiente complexo.", objectives: [o("perception","Campo perceptivo","Tenha quatro estímulos simultâneos.","perceptions",4),o("wind","Vento","Observe dez segundos de corrente.","windSeconds",10),o("memory","Memória","Mantenha três memórias ativas.","memories",3)] },
  { id: "gar-lab-behavior", mapId: "garden", mode: "laboratory", order: 1, name: "Comportamento aberto", description: "Colete observações em um ambiente amplo e menos previsível.", objectives: [o("time","Observe","Permaneça 45 s na sessão.","elapsedSeconds",45),o("perception","Estímulos","Tenha três estímulos simultâneos.","perceptions",3),o("zones","Amostragem","Visite três zonas.","visitedZones",3)] },
];

export interface MissionRuntime {
  missionId: string;
  startedAt: number;
  baseline: SimulationTelemetry;
  baselineMemories: number;
  done: string[];
  complete: boolean;
}

function cloneTelemetry(t: SimulationTelemetry): SimulationTelemetry {
  return { ...t, secrets: [...t.secrets], visitedZones: [...t.visitedZones], landedSurfaces: [...t.landedSurfaces], hideoutsFound: [...t.hideoutsFound] };
}

export function missionsFor(mapId: MapId, mode: GameModeId): MissionDefinition[] {
  if (mode === "multiplayer") return [];
  return MISSIONS.filter((mission) => mission.mapId === mapId && mission.mode === mode).sort((a, b) => a.order - b.order);
}

export function createMissionRuntime(mission: MissionDefinition, snapshot: GameSnapshot): MissionRuntime {
  return { missionId: mission.id, startedAt: performance.now(), baseline: cloneTelemetry(snapshot.telemetry), baselineMemories: snapshot.memories.length, done: [], complete: false };
}

function arrayDelta(now: string[], before: string[]): number { return now.filter((value) => !before.includes(value)).length; }

export function missionMetricValue(metric: MissionMetric, snapshot: GameSnapshot, runtime: MissionRuntime): number {
  const t = snapshot.telemetry, b = runtime.baseline;
  switch (metric) {
    case "flightDistance": return Math.max(0, t.flightDistance - b.flightDistance);
    case "landings": return Math.max(0, t.landings - b.landings);
    case "uniqueLandings": return arrayDelta(t.landedSurfaces, b.landedSurfaces);
    case "foodInteractions": return Math.max(0, t.foodInteractions - b.foodInteractions);
    case "attacksEvaded": return Math.max(0, t.attacksEvaded - b.attacksEvaded);
    case "coverEscapes": return Math.max(0, t.coverEscapes - b.coverEscapes);
    case "safeReturns": return Math.max(0, t.safeReturns - b.safeReturns);
    case "secrets": return arrayDelta(t.secrets, b.secrets);
    case "visitedZones": return arrayDelta(t.visitedZones, b.visitedZones);
    case "hideoutsFound": return arrayDelta(t.hideoutsFound, b.hideoutsFound);
    case "windSeconds": return Math.max(0, t.windSeconds - b.windSeconds);
    case "rareEvents": return Math.max(0, t.rareEvents - b.rareEvents);
    case "nearHumanSeconds": return Math.max(0, t.nearHumanSeconds - b.nearHumanSeconds);
    case "keyboardPresses": return Math.max(0, t.keyboardPresses - b.keyboardPresses);
    case "humanProvocations": return Math.max(0, t.humanProvocations - b.humanProvocations);
    case "monitorLandings": return Math.max(0, t.monitorLandings - b.monitorLandings);
    case "screenCrossings": return Math.max(0, t.screenCrossings - b.screenCrossings);
    case "windowVisits": return Math.max(0, t.windowVisits - b.windowVisits);
    case "predatorEscapes": return Math.max(0, t.predatorEscapes - b.predatorEscapes);
    case "humanMisses": return Math.max(0, t.humanMisses - b.humanMisses);
    case "elapsedSeconds": return Math.max(0, (performance.now() - runtime.startedAt) / 1000);
    case "memories": return snapshot.memories.length;
    case "perceptions": return snapshot.perceptions.length;
  }
}

export function updateMissionRuntime(runtime: MissionRuntime, mission: MissionDefinition, snapshot: GameSnapshot): MissionRuntime {
  if (runtime.complete) return runtime;
  const done = new Set(runtime.done);
  for (const objective of mission.objectives) {
    if (missionMetricValue(objective.metric, snapshot, runtime) >= objective.target) done.add(objective.id);
  }
  const nextDone = [...done];
  return { ...runtime, done: nextDone, complete: mission.objectives.every((objective) => done.has(objective.id)) };
}

export function missionUnlocked(mission: MissionDefinition, completed: string[], legacyCompletedStages: string[]): boolean {
  if (!mission.unlockAfter) return true;
  return completed.includes(mission.unlockAfter) || legacyCompletedStages.includes(mission.unlockAfter);
}

export function gameModeDefinition(id: GameModeId): GameModeDefinition {
  return GAME_MODES.find((mode) => mode.id === id) ?? GAME_MODES[0]!;
}
