# Arquitetura de jogo

## Camadas

1. **Definições de mapa (`maps.ts`)** — identidade, preview, dificuldade e objetivos de cada ambiente.
2. **Mundo (`world.ts`)** — geometria, colliders, landmarks, zonas funcionais, segredos, spawns e objetos dinâmicos por mapa.
3. **Simulação (`simulation.ts`)** — ciclo fixo, voo, atores, percepção humana, predadores, perigos, telemetria, eventos e câmeras.
4. **Cérebro (`brain.ts`)** — percepção, necessidades, memória, decisão e destino da mosca.
5. **Progressão (`progression.ts`)** — seis fases históricas da campanha do Quarto.
6. **Cenários (`scenarios.ts`)** — catálogo expansível de modos e missões por mapa, com objetivos de telemetria e desbloqueios.
7. **Estado/UI (`store.ts`)** — persistência, configurações, mapas, missões, recordes, segredos e transições.
8. **Interface (`components/musca`)** — HUD, laboratório, seletor de sessão, mapa mental, sensores e conclusão.

## Contrato para novos mapas

Um mapa novo deve fornecer um `MapDefinition` e um `WorldBuild`. Não deve inserir condicionais espalhadas pela UI. O `WorldBuild` concentra colliders, zonas, alimentos, segredos, humanos e pontos de spawn. Sistemas globais consultam o contrato do mapa.

## Contrato para novas missões

As seis fases originais continuam em `STAGES`; missões expansíveis ficam em `scenarios.ts`. Se uma ação ainda não puder ser medida, primeiro adicionar telemetria ao sistema real e só depois criar o objetivo. Nunca concluir uma missão por clique de interface quando ela descreve uma ação no mundo.

## Contrato para IA humana

A IA não pode conhecer a posição do jogador sem percepção válida. Visão usa FOV, alcance e oclusão; sons/eventos podem fornecer apenas uma região de interesse. Ataques exigem preparação, alcance, previsão, erro e recuperação. Perda de contato leva a busca pela última posição, não perseguição infinita.

## Performance

A simulação mantém passo fixo de 60 Hz com limite de steps por frame. A câmera/renderização interpola movimentos. Atores são poucos, telemetria é composta por contadores/conjuntos pequenos e sombras/partículas continuam configuráveis. Novos mapas devem reutilizar materiais e preferir assets/meshes otimizados.
