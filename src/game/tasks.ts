import type { GameSnapshot } from "./types";

export interface TaskDefinition {
  id: string;
  title: string;
  instruction: string;
  observe: string;
}

export const TASKS: TaskDefinition[] = [
  { id: "find-food", title: "Encontre alimento", instruction: "Localize comida com a visão ou pelo mapa mental.", observe: "A visão e a atenção limitam a distância de detecção." },
  { id: "eat", title: "Alimente-se", instruction: "Aproxime-se da comida e segure F.", observe: "A fome cai e a fonte entra na memória." },
  { id: "escape", title: "Escape de um predador", instruction: "Aproxime-se da aranha e saia do alcance.", observe: "Medo, reflexos e memória mudam a fuga." },
  { id: "safe", title: "Memorize um pouso", instruction: "Pouse com R e pare por alguns segundos.", observe: "O local seguro aparece no mapa." },
  { id: "brain", title: "Altere o cérebro", instruction: "Reduza qualquer módulo para 50% ou menos.", observe: "A mudança entra no ciclo da próxima decisão." },
];

export interface TaskRuntime {
  completed: string[];
  sawThreat: boolean;
  previousHunger: number;
}

export function updateTasks(runtime: TaskRuntime, snapshot: GameSnapshot): TaskRuntime {
  const next = { ...runtime, completed: [...runtime.completed] };
  const done = (id: string) => next.completed.includes(id);
  const complete = (id: string) => { if (!done(id)) next.completed.push(id); };
  const current = TASKS.find((task) => !done(task.id));
  if (!current) return { ...next, previousHunger: snapshot.hunger };

  if (current.id === "find-food" && (snapshot.perceptions.some((p) => p.kind === "food") || snapshot.memories.some((m) => m.kind === "food"))) complete(current.id);
  if (current.id === "eat" && snapshot.hunger < runtime.previousHunger - 0.35 && snapshot.memories.some((m) => m.kind === "food")) complete(current.id);
  if (current.id === "escape") {
    if (snapshot.perceptions.some((p) => p.kind === "spider") || snapshot.fear > 45) next.sawThreat = true;
    if (next.sawThreat && snapshot.fear < 22) complete(current.id);
  }
  if (current.id === "safe" && snapshot.memories.some((m) => m.kind === "safe")) complete(current.id);
  if (current.id === "brain" && Object.values(snapshot.modules).some((v) => v <= 0.5)) complete(current.id);
  next.previousHunger = snapshot.hunger;
  return next;
}
