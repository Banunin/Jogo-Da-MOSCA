# Validação da beta

- Tela inicial clássica `MUSCA` preservada.
- Campo de nome do jogador presente antes da escolha da sessão.
- Solo e Multiplayer selecionáveis na própria tela inicial.
- Solo mantém mapa, modo e missão.
- Multiplayer permite criar sala e entrar em sala usando nome e senha.
- Criador identificado como anfitrião.
- Slots são isolados por sala e não podem ser reservados por dois jogadores ao mesmo tempo.
- Saída do anfitrião encerra a sala.
- Senha não é armazenada em texto puro.
- Cliente usa `/ws` no mesmo `location.host` do site.
- Produção usa `process.env.PORT` para HTTP + WebSocket na mesma porta.
- `INICIAR.bat` existe apenas para desenvolvimento local completo; não há inicializador multiplayer separado.
- Câmeras, IA/NPC, missões e controles mobile permanecem integrados ao projeto existente.
