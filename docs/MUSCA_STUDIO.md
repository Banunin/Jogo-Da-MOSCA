# MUSCA Studio

O MUSCA Studio é o editor visual local do projeto. Ele abre o mesmo runtime do jogo e trabalha diretamente sobre a cena Three.js carregada.

## Abrir

No desenvolvimento local:

```text
http://localhost:8080/?studio=1
```

Na versão publicada, para inspeção/testes:

```text
https://banunin.github.io/Jogo-Da-MOSCA/?studio=1
```

## MVP atual

- viewport 3D sobre a cena real carregada pelo jogo;
- câmera livre de edição com OrbitControls;
- Explorer da hierarquia da cena;
- seleção por clique ou Explorer;
- Properties de nome, visibilidade, posição, rotação e escala;
- gizmos de mover, rotacionar e escalar;
- duplicar e apagar objetos durante a sessão;
- adicionar bloco, esfera e cilindro;
- importar GLB/GLTF na sessão;
- Play/Stop para alternar entre edição e teste;
- save local de transforms;
- exportação/importação de patch JSON.

## Limite desta primeira versão

O mapa legado ainda é criado por código em `world.ts`/`simulation.ts`. Por isso o Studio aplica patches sobre a cena em runtime. O próximo passo estrutural é migrar objetos estáticos dos mapas para arquivos de cena data-driven; aí o Studio poderá salvar o projeto diretamente em `project/maps/*.json`, tornando VS Code e Studio duas interfaces para o mesmo arquivo fonte.
