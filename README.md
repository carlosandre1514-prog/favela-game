# Favela Game — online

Este pacote tem tudo para colocar o jogo no ar: o servidor (Node.js + WebSocket), o jogo (`public/index.html`) e os arquivos de PWA (`manifest.json`, `sw.js`, ícones).

## Estrutura

```
favela-online/
├── server.js        servidor: entrega o jogo e conecta os jogadores (/ws)
├── package.json     dependência: ws
├── render.yaml      configuração automática do Render
└── public/
    ├── index.html   o jogo
    ├── manifest.json  PWA (tela cheia, horizontal)
    ├── sw.js          PWA (funciona offline / instala)
    └── icons/         ícones do app
```

## Passo 1 — GitHub

1. Crie uma conta em github.com (se ainda não tiver).
2. Toque em **+ → New repository**. Nome: `favela-game`. Deixe **Public** (ou Private, funciona nos dois). Toque em **Create repository**.
3. Na página do repositório, toque em **uploading an existing file** (ou **Add file → Upload files**).
4. Envie **o conteúdo da pasta** (não a pasta zip): `server.js`, `package.json`, `render.yaml`, `.gitignore`, `README.md` e a pasta `public` inteira.
   - Dica: no celular, o GitHub às vezes não aceita pastas. Se for o caso, use o navegador no modo "Site para computador" ou envie os arquivos da `public` um a um criando os caminhos (`public/index.html` etc. — ao digitar `public/` no nome do arquivo, o GitHub cria a pasta).
5. Toque em **Commit changes**.

## Passo 2 — Render

1. Entre em render.com e crie conta com **Sign in with GitHub**.
2. Toque em **New + → Web Service** e escolha o repositório `favela-game`.
3. Confira os campos:
   - **Runtime / Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Toque em **Deploy Web Service** e espere ficar **Live** (alguns minutos).
5. O Render mostra o endereço, tipo `https://favela-game-xxxx.onrender.com`.
   - Abra `endereço/health` → deve aparecer `ok`.
   - Abra o endereço puro → o jogo abre.

Observação: no plano grátis o servidor dorme quando ninguém usa e demora um pouco para acordar na primeira visita.

## Passo 3 — Atualizar o jogo depois

Sempre que eu te entregar uma versão nova do `index.html`, troque o arquivo no GitHub (Add file → Upload files, mesmo nome). O Render publica sozinho. Se mudar o jogo, troque também `VERSION` em `public/sw.js` (ex.: `favela-v2`) para o celular baixar a versão nova.

## Passo 4 — APK pelo PWA (depois que o Render estiver no ar)

1. Abra pwabuilder.com e cole o endereço do Render.
2. Ele confere o manifest e o service worker.
3. Escolha **Package for stores → Android** e baixe o pacote. Dentro vem o APK.
4. Instale o APK no celular. Abre em tela cheia e na horizontal.

## Protocolo do servidor (para o próximo passo: ligar o jogo)

Cliente → servidor (JSON em `/ws`):

| mensagem | campos |
|---|---|
| `create` | `name` |
| `join` | `code`, `name` |
| `state` | `x,y,z,yaw,pit,w` (várias vezes por segundo) |
| `shot` | `ox,oy,oz,ex,ey,ez` (efeito visual do tiro) |
| `hit` | `target`, `z` (`head` ou `body`) — o dano é calculado pelo servidor |
| `ping` | `c` |

Servidor → cliente: `joined`, `error`, `player_join`, `player_leave`, `snap` (lista de todos, 20x/s), `shot`, `damage`, `hitmark`, `kill`, `respawn`, `pong`, `fix` (servidor corrige posição), `match_end`, `match_start`.


## Melhorias desta versão
- Ciclo automático de 24 horas em 7 minutos, com iluminação solar e noturna.
- HUD online simplificado para mostrar a zona segura/de risco sem o cartão de objetivo.
- Removido o controle manual de dia/noite e o modo de mapa; permanece a troca de câmera.
- Detecção de teclado/mouse e ocultação dos controles táteis em dispositivos com ponteiro.
- Teclas: WASD mover, mouse olhar, botão esquerdo atirar, botão direito mirar, Espaço pular, Shift correr, C agachar, R recarregar, 1/2/3 trocar arma, G lançar granada.
- Granadas iniciais e coleta de munição/granadas após eliminar NPCs no offline.
- Resolução adaptativa menos agressiva e traços faciais simples nos personagens.

## Atualização da mecânica de armas (outubro/2026)
- Corrigida a rotação dupla dos modelos GLB na câmera de primeira pessoa, que podia deixar a arma atravessada.
- Ajustada a posição de primeira pessoa e adicionados braços/mãos visuais simples para apoiar a arma.
- Adicionado recuo visual curto no disparo e retorno suave, sem alterar a lógica de dano e rede.
- A mira comum usa aproximação e redução de sensibilidade; o fuzil de precisão ativa a sobreposição de luneta com retículo e zoom maior.
- A árvore não foi ativada nesta etapa para permitir testar a correção das armas separadamente, conforme o plano incremental.


## Atualização de rede e partida (outubro/2026)
- Servidor decide o dano pela arma (corpo/cabeça) e ignora o `dmg` que o cliente mandar; confere alcance, cadência (orçamento de acertos por arma) e proteção de 2 s ao renascer.
- Movimento validado no servidor (velocidade máxima com tolerância a lag); teleporte é barrado e o jogador é corrigido.
- Rodada mata-mata: primeiro a 20 abates ou 10 min; placar final por 10 s e nova rodada automática.
- Vida regenera online (5 vida/s após 5 s sem dano).
- Cliente: interpolação dos outros jogadores (100 ms de atraso), placar (segure TAB; botão PLACAR no celular), killfeed com tiro na cabeça, cronômetro da rodada no cartão da sala.
- `VERSION` do `sw.js` subiu para `favela-v6`.
- Ainda não existe checagem de linha de visão no servidor (o mapa é gerado no cliente).

## XP e níveis (outubro/2026)
- 100 níveis; o custo de cada nível sobe (250 XP + 40 por nível, ≈ 219 mil XP no total). Patentes: Recruta (1), Soldado (5), Cabo (10), Sargento (20), Subtenente (30), Tenente (40), Capitão (55), Major (70), Coronel (85), Comandante (100).
- XP online (concedido pelo servidor): abate +100, tiro na cabeça +50, sequência x3/x5/x7/x10 (+50/+100/+150/+250), partida completa +100, vitória +500, pódio 2º +250 / 3º +150. Bônus de fim de partida só com 2+ jogadores na sala.
- Offline (bots): abate +40, tiro na cabeça +20.
- O XP fica salvo no aparelho (`fv_save`). Para ele valer em qualquer aparelho e não poder ser editado, o próximo passo é criar contas com banco de dados.
- Cartão de perfil (nome, nível, patente e barra de XP) no canto superior direito da tela inicial; popup de XP e aviso de "subiu de nível" durante a partida; coluna de nível no placar.
- Ícones do app trocados pela arte nova (`public/icons`).

## Otimização para celulares fracos (outubro/2026)
- Detecção de aparelho fraco (≤6 núcleos ou ≤4 GB): começa em "Suave" se o jogador nunca escolheu a qualidade.
- Limite de pixels (Suave ≤1x, Padrão ≤1.5x) + resolução dinâmica: se o FPS cair abaixo de 38 a resolução reduz em passos (mín. 55%) e volta quando estabiliza.
- Sombras só são redesenhadas quando o jogador anda 6 m, o sol muda ou a cada 100 ms (antes: todo quadro), com snap para não tremer.
- Terreno de 57 mil para ~7 mil triângulos.
- Clarão/rastro/faíscas de tiro reaproveitam material (antes recompilava shader a cada tiro).
- Texturas das armas 1024→512 (menos memória de GPU e carga mais rápida); anisotropia 1 em aparelho fraco.
- Contexto WebGL da tela inicial encolhe durante a partida; minimapa redesenha menos em aparelho fraco.
- `sw.js` VERSION = favela-v8.

## Granadas, troca rápida e ícones (outubro/2026)
- Granada corrigida: antes atravessava o chão (o labirinto fica a 2 m de altura e o chão da granada era 0,15 m) e nunca causava dano. Agora quica no chão/telhados, bate nas paredes e a explosão (raio 6 m) respeita paredes.
- Granada bloqueada na zona segura (igual ao tiro). Botão agora usa toque imediato.
- Online: o servidor calcula o dano da granada (mensagem `nade`, 1,5 s de intervalo) e todos veem a explosão (`boom`). Precisa publicar o `server.js` novo.
- Botão ⇄ ARMA (tecla Q) alterna entre as 3 armas equipadas.
- Cada arma tem ícone próprio (fuzil, submetralhadora, escopeta, sniper).
- `sw.js` VERSION = favela-v9.
