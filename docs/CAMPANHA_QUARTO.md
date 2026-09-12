# Campanha do Quarto

O Quarto é o primeiro mapa de campanha completa do MUSCA. O objetivo desta implementação é manter simulação, IA e missão usando a mesma telemetria; nada importante na HUD é concluído por tempo ou texto fictício.

## Pontos de interesse funcionais

- monitor: pouso, provocação, cobertura traseira e segredo;
- teclado: pouso e tecla física acionável com `F`;
- computador: zona de provocação e rota de missão;
- rosto do humano: aproximação perigosa e provocação;
- janela: pouso, evento contextual e corrente de ar quando aberta;
- cama / guarda-roupa / mesa: esconderijos, frestas e cobertura;
- alimentos: lanche, bebida doce, migalha escondida e lixo;
- porta: evento contextual executado pelo humano;
- mata-moscas: aparece somente nas fases em que a mecânica é introduzida.

## Humano

Percepção usa distância, FOV, velocidade da mosca, oclusão por colisores, última posição conhecida e idade da informação. Sons locais, como uma tecla pressionada, informam apenas uma região para investigar e não revelam a posição exata do jogador.

Os eventos de janela e porta não acontecem magicamente: o humano recebe uma intenção, levanta se necessário, caminha até o objeto, interage e depois retoma a rotina. A perseguição interrompe essa intenção se a mosca for percebida.

## Missões

As seis fases são avaliadas por telemetria real. Objetivos sequenciais guardam ordem. Exemplo: em `O computador`, o retorno ao monitor só conta depois da passagem próxima ao rosto; pousar duas vezes antes da provocação não completa o objetivo.

Objetivos opcionais incluem exploração de janela, cinco superfícies, refeição sem acerto, sequência limpa de esquivas, tecla física e rotas de fresta/cobertura.

## Expansão

Novos mapas devem fornecer um `MapDefinition` em `src/game/maps.ts` e um `WorldBuild` em `src/game/world.ts`. A campanha do Quarto não deve ser copiada como um bloco monolítico: novas campanhas podem reutilizar percepção, telemetria, câmera, cérebro e interação, adicionando apenas objetivos e zonas próprias.
