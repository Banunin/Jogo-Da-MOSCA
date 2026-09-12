# Multiplayer — estado atual da beta web

O multiplayer agora é iniciado inteiramente pela interface do site. O usuário não executa servidor por `.bat` e não informa porta WebSocket separada.

A tela inicial permite informar nome, escolher Solo ou Multiplayer e, no Multiplayer, criar ou entrar em uma sala com nome e senha. O criador é marcado como anfitrião da sala. Se ele sair, a sala é encerrada.

Em produção, o processo Node usa `process.env.PORT` e atende tanto o site quanto o upgrade WebSocket em `/ws`. Assim:

- `https://dominio/` atende o jogo;
- `wss://dominio/ws` atende a sessão multiplayer;
- proxies/reverse proxies de hospedagem podem expor uma única porta pública.

O servidor isola slots, poses e eventos por sala. A senha é derivada com `scrypt` e salt aleatório; ela não é mantida em texto puro.

A arquitetura ainda é uma beta: o criador é o anfitrião lógico da sala, mas a simulação completa dos NPCs ainda não foi convertida para autoridade de host WebRTC. Portanto, não confundir o rótulo de anfitrião com um modelo P2P totalmente autoritativo. Essa conversão pode ser feita depois sem voltar ao modelo `.bat`, usando sinalização pelo próprio `/ws` e WebRTC entre navegadores.
