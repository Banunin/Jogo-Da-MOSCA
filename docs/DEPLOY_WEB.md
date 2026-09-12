# Publicação web do MUSCA

O projeto foi preparado para rodar como uma aplicação Node única: o mesmo processo serve o build do jogo e aceita conexões WebSocket em `/ws`. Isso evita uma segunda porta pública e funciona atrás de HTTPS/reverse proxy, onde o navegador troca automaticamente `https://` por `wss://`.

## Produção

```bash
npm ci
npm run build
npm start
```

O servidor lê `PORT` automaticamente. Em desenvolvimento, o fallback é `8080`.

Rotas importantes:

- `/` — jogo;
- `/ws` — WebSocket multiplayer;
- `/health` — healthcheck JSON para a hospedagem.

## Render

O repositório inclui `render.yaml`. No Render, crie um Blueprint/Web Service apontando para este repositório. O serviço usa:

- build: `npm ci && npm run build`;
- start: `npm start`;
- healthcheck: `/health`;
- Node 20.

Não configure uma porta fixa no painel: o Render injeta `PORT`.

## Railway / plataformas Node

Use:

- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Healthcheck: `/health`, quando disponível.

A plataforma deve suportar WebSocket persistente. Não separe `/ws` em outro serviço sem também alterar a arquitetura.

## Docker

```bash
docker build -t musca .
docker run --rm -p 8080:8080 -e PORT=8080 musca
```

Abra `http://localhost:8080`.

## O que NÃO usar como hospedagem principal

GitHub Pages e hosts puramente estáticos não executam o servidor Node e, portanto, não conseguem criar salas multiplayer. Plataformas serverless que não garantem WebSocket persistente também não são adequadas para esta versão do multiplayer.

## Variáveis opcionais

Consulte `.env.example`:

- `PORT`: porta HTTP + WebSocket;
- `MUSCA_MAX_CONNECTIONS`: conexões simultâneas aceitas por instância;
- `MUSCA_MAX_ROOMS`: máximo de salas por instância;
- `MUSCA_ROOM_IDLE_MINUTES`: expiração de salas vazias.

As senhas de sala existem apenas em memória, derivadas com `scrypt` e salt. Elas não são gravadas em banco ou log.

## Escala e persistência

A beta usa estado em memória. Isso significa que uma instância única funciona corretamente para testes e partidas entre amigos, mas:

- reiniciar o processo encerra as salas;
- duas instâncias independentes não compartilham salas;
- autoscaling horizontal exige Redis/pub-sub ou outro coordenador antes de ser ativado.

Para a beta, mantenha **1 instância** do servidor. Quando for necessário escalar, migre salas/presença para um backend compartilhado antes de aumentar o número de réplicas.

## Checklist depois do deploy

1. Abra `/health` e confirme `{"ok":true,...}`.
2. Abra o jogo em dois navegadores/dispositivos.
3. Crie uma sala no primeiro cliente.
4. Entre na mesma sala no segundo usando a senha.
5. Escolha personagens diferentes.
6. Confirme movimento remoto e encerramento da sala ao sair o anfitrião.
7. Teste pelo domínio HTTPS real para confirmar `wss://`.
