# Multiplayer do site

O multiplayer da beta nao possui mais um modo separado iniciado por `.bat`.

## Fluxo do jogador

1. Abrir o site.
2. Informar o nome do jogador na tela inicial.
3. Escolher `Multiplayer`.
4. Escolher `Criar sala` ou `Conectar a uma sala`.
5. Informar nome da sala e senha.
6. Escolher o personagem disponivel.
7. Jogar.

A sala e isolada das demais e a senha nao e armazenada em texto puro no servidor: e derivada com `scrypt` e salt aleatorio.

## Porta em producao

O processo de producao usa `process.env.PORT` quando a hospedagem fornecer essa variavel. HTTP e WebSocket compartilham a mesma porta:

- Site: `https://dominio/`
- WebSocket: `wss://dominio/ws`

O navegador monta `/ws` automaticamente a partir de `location.host`, entao o jogador nao precisa conhecer nem configurar uma porta WebSocket separada.

Comandos:

- `npm run build` — gera `dist/`.
- `npm start` — serve `dist/` e o multiplayer na mesma porta.
- `npm run dev:full` — desenvolvimento local: Vite em 8080, backend WS em 8081 e proxy `/ws` transparente.

## Salas

A primeira conexao que cria a sala e registrada como anfitriao. Se o anfitriao sair, a sala e encerrada e os demais jogadores recebem o aviso na interface. O mapa escolhido pelo anfitriao faz parte da configuracao da sala e e aplicado aos jogadores que entrarem.
