# Implementação — campanha do Quarto e arquitetura de mapas

Esta evolução foi aplicada sobre a base existente. Voo, cérebro, memória, IA autônoma da mosca, laboratório, tarefas experimentais, predadores, física, GLBs, configurações e controles anteriores foram preservados.

## Estrutura de mapas

A simulação deixou de depender de um único cenário. `maps.ts` descreve os ambientes e `world.ts` constrói um `WorldBuild` independente com colliders, landmarks, zonas de interação, segredos, humanos e spawns próprios.

Ambientes atuais:

- **Quarto** — campanha principal;
- **Cozinha** — exploração sistêmica com água, fogo, vento e aspirador;
- **Jardim** — ambiente aberto com plantas, alimento e criaturas.

## Quarto

O Quarto foi construído em escala de mosca e contém cama, área sob a cama, guarda-roupa, estante, criado-mudo, mesa, cadeira, computador, monitor, teclado, mouse, gabinete, cabos, luminárias, lixeira, janela, porta, ventilador, alimentos, coberturas, frestas e locais seguros.

Monitor, teclado, frente da tela, janela, esconderijos e coberturas não são apenas decoração: são zonas reconhecidas pela telemetria e usadas por missões/IA. O teclado possui uma tecla física que pode ser pressionada com `F` quando a mosca está pousada.

## Campanha

A campanha possui seis fases funcionais:

1. Primeiro voo;
2. Hora de comer;
3. Não deixe ele te pegar;
4. O computador;
5. A raquete;
6. Fome e perigo.

Cada objetivo é avaliado por acontecimentos reais da simulação. A conclusão desbloqueia a fase seguinte e registra tempo, ataques evitados, alimento e número de conclusões.

## Humano

O dono do quarto possui rotina de computador, caminhada e reação contextual. A percepção usa distância, campo de visão, velocidade da mosca, oclusão e última posição conhecida. Objetos podem gerar pistas locais (por exemplo, uma tecla pressionada) sem revelar a posição exata do jogador.

O ataque usa previsão curta + erro humano. A mão e o mata-moscas possuem envelopes de alcance horizontal/vertical; o NPC precisa se posicionar antes de atacar. Ao perder a mosca, procura a última região conhecida, desiste e retorna ao computador.

## Câmera

A terceira pessoa é um rig independente com distância/altura configuráveis, órbita contínua por mouse/toque, zoom, look-ahead, colisão com cenário e transição amortecida. O modo Observação usa outra lógica de órbita, também controlável e com troca de alvo. `Esc` continua exclusivamente responsável pelo cursor e `Tab` pelas configurações.
