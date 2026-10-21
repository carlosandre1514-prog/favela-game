Favela Game — assets adicionados
================================

Assets integrados em public/assets:

- character/male_casual.fbx + man_tex.png: visual de personagem importado.
- trees/Trees.fbx e texturas: árvores decorativas nas bordas do cenário.
- weapons/*.glb: modelos 3D para armas (AK-47, MAC-10, escopeta, rifle de precisão), granada e caixa de munição.

O jogo usa Three.js r128 e carrega os modelos FBX/GLB pelos loaders oficiais dessa mesma versão.
Se os modelos não carregarem (por exemplo, se a conexão com o CDN estiver bloqueada), o jogo mantém os modelos procedurais de fallback.

Observação: os modelos externos são carregados de forma assíncrona. O teste final de escala, orientação e desempenho deve ser feito no navegador/celular em que o jogo será publicado.


Armas (v11): AK-47, M4A1, MAC-10, escopeta, AWP e Barrett .50 — 6 armas, nenhuma repetida. M4A1 (m4a1.glb) e Barrett (barret.glb) vieram dos packs enviados; os modelos novos são redimensionados automaticamente pelo jogo (WEAPON_NORM no index.html).
