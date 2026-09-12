# MUSCA — Beta Web

Jogo 3D de sobrevivência em escala de mosca, preparado para PC e mobile, com campanha, exploração, sobrevivência, desafios, laboratório/observação e multiplayer por salas dentro do próprio site.

## Estado desta versão

Esta branch contém a base da primeira beta jogável: tela inicial, Solo/Multiplayer, criação e entrada em salas com nome/senha, seleção de mapa/modo/missão, câmeras em 1ª/3ª pessoa/observação, IA de NPCs, controles PC/mobile/gamepad e servidor web com WebSocket.

## Rodar localmente

Requer Node.js 20.19+.

```bash
npm install
npm run dev
```

No Windows também é possível usar `INICIAR.bat`.

## Produção

```bash
npm install
npm run build
npm start
```

O servidor usa `process.env.PORT` e serve o jogo e o multiplayer na mesma porta:

- `https://seu-dominio/` — jogo
- `wss://seu-dominio/ws` — multiplayer
- `/health` — healthcheck

Isso evita depender de `.bat` para multiplayer. O `.bat` existente é apenas conveniência de desenvolvimento local.

## Multiplayer

O fluxo fica dentro do jogo:

1. informar o nome do jogador;
2. escolher Multiplayer;
3. criar sala ou entrar em uma sala;
4. informar nome da sala e senha;
5. escolher personagem e iniciar.

As salas são isoladas no servidor. O criador é o anfitrião lógico da sala. A senha é derivada no servidor antes de armazenamento em memória.

## Mapas, modos e missões

A arquitetura está separada em catálogos para permitir adicionar novos mapas, modos e missões sem reescrever a interface principal. A campanha original foi preservada e há missões adicionais baseadas em telemetria real do jogo.

## Código-fonte empacotado

Para manter o repositório leve, cinco arquivos grandes ficam em `source-pack/source-bundle.json.gz` e são reconstruídos automaticamente antes de desenvolvimento, build e checagem:

- `src/game/simulation.ts`
- `src/game/world.ts`
- `src/game/store.ts`
- `src/game/models.ts`
- `src/styles.css`

Os scripts `predev`, `prebuild` e `precheck` executam `npm run source` automaticamente. O bundle contém apenas código-fonte deste projeto.

## Deploy

O projeto inclui:

- `Dockerfile` para deploy em container;
- `render.yaml` para Render;
- `Procfile` para plataformas compatíveis;
- GitHub Actions em `.github/workflows/ci.yml`;
- servidor Node de produção em `scripts/site-server.mjs`;
- backend de salas em `scripts/room-server.mjs`;
- PWA/metadata em `public/site.webmanifest`, `robots.txt` e favicon.

GitHub Pages sozinho não é suficiente para o multiplayer, porque ele não mantém o processo Node/WebSocket. Use uma hospedagem Node/Container como Render, Railway, Fly.io ou infraestrutura equivalente.

## Comandos

```bash
npm run source   # reconstrói módulos grandes
npm run models   # gera modelos 3D procedurais
npm run check    # TypeScript
npm run dev      # desenvolvimento
npm run build    # build Vite
npm start        # servidor de produção
```

## Beta test

Consulte `docs/BETA_TESTE.md` para o roteiro de validação com testers.
