# Prompts para criar skins de arma (Favela FPS)

## Como usar (vale para todas as armas)

1. Abra uma IA de imagem que aceite **imagem de referência e edição** (ChatGPT/GPT-Image, Gemini, Leonardo etc.).
2. Anexe o **molde** da arma (`<arma>_molde.png`). É nele que a IA pinta.
3. Cole o prompt da arma e troque `[TEMA]` pelo seu tema. Exemplo: *"dragão de gelo, preto com raios azul elétrico e detalhes prata"*.
4. Peça a saída em **2048 × 2048** (quadrada). Se a IA só fizer 1024, também serve.
5. Me mande a imagem pronta. Eu confiro o encaixe e coloco no jogo.

O arquivo `<arma>_guia.png` é só para você entender o molde. Cada cor é uma parte da arma, e embaixo tem a arma de lado com as mesmas cores. **Não mande o guia para a IA.**

### O que estraga uma skin (e por que)
- **Mover, girar, aumentar ou cortar as peças:** cada peça cinza tem um lugar exato no modelo 3D. Se mudar 1 cm, a pintura cai no lugar errado da arma.
- **Linhas do molde, números ou texto na imagem:** viram parte da pintura.
- **Sombras, brilho e perspectiva** (imagem com "cara de foto 3D"): o jogo já faz a luz. A textura tem que ser plana.
- **Fundo colorido entre as peças:** não aparece, mas atrapalha. Peça fundo preto.

---

## AK-47 — anexe `ak47_v2_molde.png`

```
Use a imagem anexada como MOLDE EXATO de textura (mapa UV) de um fuzil AK-47 para um jogo 3D.
A imagem é dividida em 4 quadros (2x2) separados por linhas finas; mantenha os 4 quadros exatamente onde estão.
Pinte uma skin com o tema: [TEMA].

Regras obrigatórias:
- Mesmo tamanho e enquadramento da imagem anexada (quadrada, 2048x2048). NÃO mova, gire, redimensione, corte, junte ou crie peças.
- Pinte SOMENTE dentro das peças cinza, avançando 6 pixels além da borda de cada peça. Fora das peças: preto liso.
- Textura plana (albedo): sem sombras, sem reflexos, sem perspectiva, sem render 3D, sem fundo de cenário.
- Sem texto, sem números, sem marca d'água e sem as linhas de contorno do molde.
- O mesmo desenho e a mesma escala de padrão em todas as peças, como se a arma inteira tivesse sido pintada de uma vez.

Onde fica cada parte:
- Quadro superior esquerdo: as duas peças grandes à esquerda são as LATERAIS DA CORONHA (lugar ideal para o desenho principal / emblema);
  as duas peças curvas largas no centro são as LATERAIS DO CARREGADOR; as tiras curvas finas à direita são a frente e o fundo do carregador;
  as peças no topo e as pequenas embaixo são a EMPUNHADURA; as tiras compridas verticais são o topo e a base da coronha.
- Quadro superior direito: CORPO (receptor) — as peças altas no topo e as duas compridas pontudas à direita são as laterais do corpo
  (segundo melhor lugar para o emblema); as tiras verticais são a parte de cima e de baixo do corpo.
- Quadro inferior esquerdo: GUARDA-MÃO (tiras compridas e peças do meio), uma tira vermelha comprida = CANO (metal escuro),
  blocos grandes no topo = bloco da ALÇA DE MIRA.
- Quadro inferior direito: PEÇAS PEQUENAS (parafusos, pinos, gatilho, quebra-chama, MASSA DE MIRA) — pinte em metal escuro com toques do tema.
```

## M4A1 — anexe `m4a1_v2_molde.png`

```
Use a imagem anexada como MOLDE EXATO de textura (mapa UV) de um fuzil M4A1 para um jogo 3D.
Pinte uma skin com o tema: [TEMA].

Regras obrigatórias:
- Mesmo tamanho e enquadramento da imagem anexada (quadrada, 2048x2048). NÃO mova, gire, redimensione, corte, junte ou crie peças.
- Pinte SOMENTE dentro das peças cinza, avançando 6 pixels além da borda de cada peça. Fora das peças: preto liso.
- Textura plana (albedo): sem sombras, sem reflexos, sem perspectiva, sem render 3D.
- Sem texto, sem números, sem marca d'água e sem as linhas de contorno do molde.
- O mesmo desenho e a mesma escala de padrão em todas as peças. Mantenha visíveis os furos e recortes que já existem nas peças.

Onde fica cada parte:
- Faixa de cima (tiras com furos redondos e retangulares) e as duas colunas verticais com furos à esquerda: GUARDA-MÃO / trilhos.
- Peças grandes no topo, ao centro e à direita (formato de coronha telescópica): CORONHA — bom lugar para o emblema.
- Retângulo grande horizontal à esquerda, no meio: CANO (metal escuro, desenho discreto).
- Duas peças grandes curvas no lado direito, no meio: LATERAIS DO CARREGADOR.
- Peças no canto inferior direito: EMPUNHADURA.
- Peças grandes na metade de baixo, centro e esquerda: CORPO (receptor superior e inferior) — segundo melhor lugar para o emblema.
- Peças pequenas e finas espalhadas: miras, pinos, alavancas e trava — metal escuro com toques do tema.
```

## MAC-10 — anexe `mac10_molde.png`

```
Use a imagem anexada como MOLDE EXATO de textura (mapa UV) de uma submetralhadora MAC-10 para um jogo 3D.
Pinte uma skin com o tema: [TEMA].

Regras obrigatórias:
- Mesmo tamanho e enquadramento da imagem anexada (quadrada, 2048x2048). NÃO mova, gire, redimensione, corte, junte ou crie peças.
- Pinte SOMENTE dentro das peças cinza, avançando 6 pixels além da borda de cada peça. Fora das peças: preto liso.
- Textura plana (albedo): sem sombras, sem reflexos, sem perspectiva, sem render 3D.
- Sem texto, sem números, sem marca d'água e sem as linhas de contorno do molde.
- O mesmo desenho e a mesma escala de padrão em todas as peças.

Onde fica cada parte:
- As duas peças grandes no canto inferior esquerdo e as peças largas no meio à esquerda: LATERAIS DA EMPUNHADURA
  (na MAC-10 o carregador entra pela empunhadura) — lugar ideal para o emblema.
- Retângulos compridos à esquerda, com fendas: CORPO (caixa da arma) — segundo lugar para o emblema.
- Tiras verticais no centro: CARREGADOR.
- Retângulos vermelhos: CANO / ponta do cano (metal escuro).
- Peças arredondadas à direita do centro e tiras finas verticais: CORONHA DE ARAME (dobrável) — metal com toques do tema.
```

## ESCOPETA — anexe `shotgun_molde.png`

```
Use a imagem anexada como MOLDE EXATO de textura (mapa UV) de uma escopeta pump para um jogo 3D.
Pinte uma skin com o tema: [TEMA].

Regras obrigatórias:
- Mesmo tamanho e enquadramento da imagem anexada (quadrada, 2048x2048). NÃO mova, gire, redimensione, corte, junte ou crie peças.
- Pinte SOMENTE dentro das peças cinza, avançando 6 pixels além da borda de cada peça. Fora das peças: preto liso.
- Textura plana (albedo): sem sombras, sem reflexos, sem perspectiva, sem render 3D.
- Sem texto, sem números, sem marca d'água e sem as linhas de contorno do molde.
- O mesmo desenho e a mesma escala de padrão em todas as peças.

Onde fica cada parte:
- Peça grande no canto inferior esquerdo: CORPO (receptor) — lugar ideal para o emblema.
- Peça em formato de coronha à esquerda (logo abaixo da fileira de cima), a tira comprida horizontal no topo e as peças compridas à direita: CORONHA.
- Retângulo grande no centro-esquerda, o retângulo pequeno no canto superior esquerdo e o retângulo vertical à direita: CANO.
- Dois retângulos grandes à direita, no meio: GUARDA-MÃO (o "pump" que puxa para recarregar) e tubo do carregador.
- Peças em arco no topo: GUARDA-MATO (proteção do gatilho).
```

## AWP (SNIPER) — anexe `awp_molde.png`

```
Use a imagem anexada como MOLDE EXATO de textura (mapa UV) de um rifle de precisão AWP com luneta para um jogo 3D.
Pinte uma skin com o tema: [TEMA].

Regras obrigatórias:
- Mesmo tamanho e enquadramento da imagem anexada (quadrada, 2048x2048). NÃO mova, gire, redimensione, corte, junte ou crie peças.
- Pinte SOMENTE dentro das peças cinza, avançando 6 pixels além da borda de cada peça. Fora das peças: preto liso.
- Textura plana (albedo): sem sombras, sem reflexos, sem perspectiva, sem render 3D.
- Sem texto, sem números, sem marca d'água e sem as linhas de contorno do molde.
- O mesmo desenho e a mesma escala de padrão em todas as peças.

Onde fica cada parte:
- Retângulo vertical grande à esquerda: TUBO DA LUNETA (desenho contínuo ao longo do comprimento).
- Dois círculos no topo: LENTES da luneta — pinte como vidro escuro azulado, sem desenho.
- Peças grandes à direita, com um furo (onde passa o polegar) e as peças compridas no topo: CORONHA — lugar ideal para o emblema.
- Peças verticais compridas no centro e à direita: CORPO (receptor e base da coronha).
- Retângulo vermelho no meio: CANO (metal escuro).
- Peças estreitas laranja: CARREGADOR.
```

## BARRETT — anexe `barret_molde.png`

```
Use a imagem anexada como MOLDE EXATO de textura (mapa UV) de um rifle pesado Barrett .50 para um jogo 3D.
Neste molde as peças formam a própria arma vista de lado. Pinte como uma vista lateral contínua da arma, dentro das formas.
Pinte uma skin com o tema: [TEMA].

Regras obrigatórias:
- Mesmo tamanho e enquadramento da imagem anexada (quadrada, 2048x2048). NÃO mova, gire, redimensione, corte, junte ou crie peças.
- Pinte SOMENTE dentro das formas cinza, avançando 6 pixels além da borda. Fora delas: preto liso.
- Textura plana (albedo): sem sombras, sem reflexos, sem perspectiva, sem render 3D.
- Sem texto, sem números, sem marca d'água e sem as linhas de contorno do molde.

Onde fica cada parte:
- Forma retangular grande no topo: CORPO e trilho — lugar ideal para o emblema.
- Parte comprida à direita, terminando no bloco largo: CANO e freio de boca (metal escuro).
- Forma inclinada estreita embaixo à esquerda: EMPUNHADURA.
- Bloco inclinado embaixo à direita: CARREGADOR.
- Peça pequena à esquerda: CORONHA.
```
