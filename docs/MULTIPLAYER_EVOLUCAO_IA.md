# Multiplayer e evolução da IA

Esta beta preserva o modo solo e inclui multiplayer por salas privadas diretamente no site.

O fluxo é: nome do jogador -> Solo/Multiplayer -> criar ou conectar em sala -> nome/senha -> escolher personagem -> jogar.

As salas isolam jogadores e personagens entre si. O mapa é definido pelo criador e enviado aos participantes. O servidor do site compartilha a mesma porta HTTP/WebSocket em produção (`/ws`).

A IA/NPC continua sendo desenvolvida independentemente da camada de transporte multiplayer. Para uma versão pública competitiva, decisões críticas de NPC, dano e progressão devem migrar para uma autoridade única de sessão ou host WebRTC para evitar divergência entre clientes.
