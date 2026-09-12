export type MapId = "bedroom" | "kitchen" | "garden";

export interface MapDefinition {
  id: MapId;
  name: string;
  subtitle: string;
  difficulty: "Fácil" | "Média" | "Difícil";
  preview: string;
  description: string;
  objectives: string[];
  secrets: number;
  campaign: boolean;
}

export const MAPS: MapDefinition[] = [
  {
    id: "bedroom",
    name: "Quarto",
    subtitle: "Casa humana · campanha principal",
    difficulty: "Média",
    preview: "/assets/ui/map-bedroom.svg",
    description: "Mesa, computador, cama, janela, esconderijos e um humano que reage ao que a mosca faz.",
    objectives: ["Alimentar-se", "Incomodar o humano", "Usar o quarto como cobertura"],
    secrets: 5,
    campaign: true,
  },
  {
    id: "kitchen",
    name: "Cozinha",
    subtitle: "Alimento abundante · perigos ambientais",
    difficulty: "Difícil",
    preview: "/assets/ui/map-kitchen.svg",
    description: "Comida em abundância, água, calor, ventilação e predadores em uma área aberta.",
    objectives: ["Explorar bancadas", "Evitar fogo e vento", "Encontrar alimentos"],
    secrets: 3,
    campaign: true,
  },
  {
    id: "garden",
    name: "Jardim",
    subtitle: "Ambiente aberto · criaturas",
    difficulty: "Difícil",
    preview: "/assets/ui/map-garden.svg",
    description: "Folhas, flores, frutas caídas e pouco abrigo. Predadores enxergam de longe.",
    objectives: ["Explorar verticalmente", "Encontrar néctar/fruta", "Usar plantas como abrigo"],
    secrets: 3,
    campaign: true,
  },
];

export function mapDefinition(id: MapId): MapDefinition {
  return MAPS.find((map) => map.id === id) ?? MAPS[0]!;
}
