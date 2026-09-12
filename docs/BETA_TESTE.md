# MUSCA — roteiro da primeira beta

## Antes do teste

Para a versão publicada, cada jogador abre o mesmo endereço do site. Não existe `.bat` multiplayer.

No desenvolvimento local, `INICIAR.bat` sobe o ambiente completo e abre `http://localhost:8080`. A interface do jogo continua sendo responsável por criar ou entrar nas salas.

## Multiplayer

1. Abra o site em dois navegadores/dispositivos.
2. Em ambos, informe um nome de jogador.
3. No primeiro, escolha **Multiplayer > Criar sala**, defina nome, senha e mapa.
4. No segundo, escolha **Multiplayer > Conectar a uma sala** e informe exatamente o mesmo nome e senha.
5. Confirme que cada jogador consegue reservar um personagem diferente.
6. Confirme que posições dos personagens remotos são atualizadas.
7. Teste a saída de um convidado e a liberação da vaga.
8. Teste a saída do anfitrião: a sala deve ser encerrada para os demais.

Em produção, HTTP e WebSocket usam a mesma porta da hospedagem. O navegador conecta automaticamente em `/ws`, usando `ws://` em HTTP e `wss://` em HTTPS.

## Câmeras

Teste primeira pessoa, terceira pessoa e observação. Na terceira pessoa, verifique zoom, rotação, seguimento e colisão com paredes/móveis. Na observação, troque o alvo e confirme que a câmera continua controlável.

## NPCs

Procure NPCs atravessando mesas, paredes ou objetos; andando em círculos; tremendo em cantos; ou permanecendo presos. Registre o mapa, objeto e situação.

## Missões

Teste desbloqueio, reinício e conclusão. Reiniciar uma missão não pode carregar contadores da tentativa anterior.

## Mobile

Teste joystick, câmera por toque, subir/descer, boost, pousar e interação. Confira se botões e cartão de objetivo não se sobrepõem.

## Como reportar

Ao reportar um problema, anote mapa, modo, missão, câmera, dispositivo, navegador e o que estava acontecendo imediatamente antes. Para multiplayer, informe nome da sala, quem era anfitrião, função de cada jogador e se o site estava em HTTP ou HTTPS.
