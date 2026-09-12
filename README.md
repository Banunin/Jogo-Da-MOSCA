# MUSCA — Beta Web

> [!IMPORTANT]
> **Projeto congelado / em pausa.** O desenvolvimento do MUSCA foi interrompido por tempo indeterminado. O repositório e o estado atual do jogo estão sendo preservados para que o projeto possa ser retomado no futuro, caso faça sentido. Não há desenvolvimento ativo no momento.

Jogo 3D de sobrevivência em escala de mosca, preparado para PC e mobile, com campanha, exploração, sobrevivência, desafios, laboratório/observação e multiplayer por salas dentro do próprio site.

## Beta atual

O projeto preserva a tela inicial do MUSCA e o fluxo agora é: nome do jogador → Solo ou Multiplayer. No Solo, o jogador escolhe mapa, modo e missão. No Multiplayer, cria uma sala ou entra em uma existente informando sala e senha, tudo dentro do próprio site.

## Rodar localmente

Requer Node.js 20.19+.

```bash
npm install
npm run dev
```

No Windows, `INICIAR.bat` é apenas uma conveniência de desenvolvimento. O multiplayer não depende de `.bat`.

## Produção

```bash
npm install
npm run build
npm start
```

O servidor usa `process.env.PORT` e entrega tudo pela mesma porta:

- `/` — jogo;
- `/ws` — multiplayer via WebSocket (`ws://`/`wss://` automaticamente);
- `/health` — healthcheck.

## Multiplayer

As salas são isoladas no servidor. O criador é o anfitrião lógico da sala. A senha é derivada antes de ser mantida em memória. O servidor possui heartbeat, validações e limites básicos para uma beta pública controlada.

## Fonte e build

Alguns módulos grandes ficam compactados em fragmentos dentro de `source-pack/`. `scripts/reconstruct-source.mjs` os reconstrói automaticamente antes de `dev`, `build` e `check`. Não há download externo para reconstruir o código-fonte.

## Deploy

O repositório inclui `Dockerfile`, `render.yaml`, `Procfile`, GitHub Actions, servidor Node de produção, backend WebSocket e metadata/PWA. GitHub Pages sozinho não atende o multiplayer por não executar o servidor Node/WebSocket. Use Render, Railway, Fly.io ou host Node/Container equivalente.

## Comandos

```bash
npm run source
npm run models
npm run check
npm run dev
npm run build
npm start
```

Consulte `docs/BETA_TESTE.md` para o roteiro da primeira rodada de beta com seus amigos.
