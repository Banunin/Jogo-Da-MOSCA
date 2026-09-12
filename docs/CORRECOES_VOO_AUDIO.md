# Correções de orientação, áudio e voo

## Aranha

A frente dos modelos GLB e procedural aponta para -Z. A rotação agora usa esse eixo e acompanha a velocidade real da aranha, inclusive ao contornar obstáculos. A física, a perseguição e as animações das pernas continuam ativas.

## Áudio

Abra Configurações com Tab. Volume geral, efeitos e zumbido aparecem em porcentagem de 0 a 150%, com salvamento automático no navegador. Zero silencia o canal. Há botões para testar o som e restaurar somente o áudio padrão.

O novo padrão é 100% geral, 100% efeitos e 90% zumbido. O sinal dos efeitos foi amplificado em 2,2 vezes, e o zumbido recebeu mais ganho e um filtro mais amplo. A compressão controla picos. Configurações antigas e volumes zerados são preservados: use Restaurar áudio padrão se quiser adotar os novos valores.

## Câmera

Primeira e terceira pessoa recebem vibração progressiva com velocidade, oscilação de voo, reação à aceleração e desaceleração e abertura gradual do campo de visão. A terceira pessoa também recebe inclinação nas curvas. A câmera de observação e o humano não recebem a vibração da mosca.

A intensidade é ajustável em Configurações → Voo e câmera. Zero desativa a vibração e a variação de FOV por velocidade. A vibração é aplicada apenas à câmera renderizada, sem alterar direção dos controles, física ou colisões. O efeito anterior é removido antes do próximo quadro para evitar desvio acumulado.

## Multiplayer

O plano solicitado está em MULTIPLAYER_HOST.md. Esta entrega não implementa VPN nem salas WebRTC.

## Validação desta entrega

TypeScript sem erros e build de produção concluído. Verificações numéricas confirmaram orientação da aranha em seis direções e ausência de desvio acumulado da câmera a 30, 60 e 144 FPS, com intensidade zero desativando a vibração. A inspeção visual no navegador e a avaliação auditiva não foram concluídas neste ambiente, pois o navegador de teste não pôde ser instalado.
