/* Personagens 3D (Quaternius Universal Base Characters + Universal Animation Library, licença CC0).
   O boneco procedural (GameAssets3D.buildHumanoid) continua existindo e mandando em tudo: hitboxes, soquete da
   arma, IK dos braços e estado (andar/agachar/pular). Quando os modelos carregam, ele fica invisível e um corpo
   com esqueleto (SkinnedMesh) passa a ser desenhado no lugar:
   - pernas/tronco: animações reais (parado, andar, trotar, correr, agachado, pulo), misturadas pela velocidade;
   - braços: IK de 2 ossos até as mãos do boneco procedural (que já seguram a arma no lugar certo);
   - roupa: pintada por região do corpo (camisa/calça/tênis) na textura, com as cores de cada skin. */
(function () {
  const GA = window.GameAssets3D, THREE = window.THREE;
  if (!GA || !THREE || !THREE.GLTFLoader || !THREE.SkeletonUtils) return;
  const BASE = 'assets/chars/';
  const CLIPS = { idle: 'Idle_Loop', walk: 'Walk_Loop', jog: 'Jog_Fwd_Loop', sprint: 'Sprint_Loop', cIdle: 'Crouch_Idle_Loop', cFwd: 'Crouch_Fwd_Loop', jump: 'Jump_Loop' };
  const SPEED = { walk: 2.2, jog: 4.8, sprint: 7, cFwd: 1.6 };   // m/s em que cada animação fica natural
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const loader = new THREE.GLTFLoader();
  const load = url => new Promise((ok, no) => loader.load(BASE + url, ok, undefined, no));
  const low = () => !!window.FAVELA_LOW;

  /* ---------- carregamento (depois que o jogo abriu, para não atrasar a entrada) ---------- */
  const tpl = {}, waiting = { male: [], female: [] };
  let started = false;
  let shared = null, sharedP = null;
  function loadShared() {
    if (sharedP) return sharedP;
    sharedP = Promise.all([load('anims.glb'), load('hair.glb'), new Promise(ok => new THREE.TextureLoader().load(BASE + 'hair.webp', ok, undefined, () => ok(null)))])
      .then(([an, hr, ht]) => {
        const clips = {}; for (const k in CLIPS) clips[k] = THREE.AnimationClip.findByName(an.animations, CLIPS[k]);
        const hair = {}; hr.scene.updateMatrixWorld(true);
        hr.scene.traverse(o => { if (o.isMesh) { const m = o.clone(); m.matrixAutoUpdate = false; m.matrix.copy(o.matrixWorld); hair[o.name || o.parent.name] = m; } });
        if (ht) { ht.flipY = false; ht.encoding = THREE.sRGBEncoding; }
        return (shared = { clips, hair, hairTex: ht });
      });
    return sharedP;
  }
  const loading = {};
  function loadKind(kind) {
    if (loading[kind]) return loading[kind];
    return (loading[kind] = Promise.all([load(kind + '.glb'), loadShared()]).then(([g]) => {
      tpl[kind] = prepTemplate(g.scene);
      const q = waiting[kind].splice(0); for (const r of q) upgrade(r);
    }).catch(e => console.warn('Personagem 3D não carregou:', kind, e)));
  }

  function prepTemplate(scene) {
    let body = null, eyes = null, brows = null;
    scene.traverse(o => { if (o.isSkinnedMesh) { const n = o.geometry.index.count; if (!body || n > body.geometry.index.count) body = o; } });
    scene.traverse(o => { if (o.isSkinnedMesh && o !== body) { if (/eye/i.test(o.material.name)) eyes = o; else brows = o; } });
    body.geometry.computeBoundingBox();
    const map = body.material.map; map.anisotropy = low() ? 1 : 4;
    return { scene, body: body.name, eyes: eyes && eyes.name, brows: brows && brows.name, map, h: body.geometry.boundingBox.max.y };
  }

  /* ---------- roupa: shader que pinta por região do corpo na pose de origem (T) ----------
     Medidas do modelo masculino (1,81 m; feminino é escalado pela altura): cintura y≈.98, joelho ≈.50,
     tornozelo ≈.10, pescoço ≈1.46; braços abertos em x: ombro ≈.2, cotovelo ≈.45, punho ≈.7.
     A sombra/dobras vêm do brilho da própria textura. Todas as skins dividem a mesma textura e o mesmo programa. */
  const matCache = {};
  const linC = c => new THREE.Color(c).convertSRGBToLinear();
  function outfitMat(kind, o) {
    const police = !!(o.police || o.helmet), key = [kind, o.skin, o.shirt, o.shorts, o.gear, o.sleeveless, police].join('|');
    if (matCache[key]) return matCache[key];
    const t = tpl[kind], sc = t.h / 1.81, sk = new THREE.Color(o.skin || '#b07850');
    const U = {
      uShirt: { value: linC(o.shirt || '#34443b') }, uPants: { value: linC(o.shorts || '#202a26') },
      uShoes: { value: linC(police ? '#121315' : '#e9e7e0') }, uGlove: { value: linC(o.gear || '#1c1f24') },
      uSkin: { value: new THREE.Vector3(Math.min(1.25, sk.r / .69), Math.min(1.25, sk.g / .47), Math.min(1.25, sk.b / .33)) },   // tom médio da pele da textura ≈ (.69,.47,.33)
      uCut: { value: new THREE.Vector4(o.sleeveless ? .19 : police ? .67 : .37, police ? .1 : .52, police ? .67 : 9, sc) }   // manga até x, calça até y, luva a partir de x, escala
    };
    const m = new THREE.MeshLambertMaterial({ map: t.map, skinning: true });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vBind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBind = position;');
      sh.fragmentShader = 'varying vec3 vBind;\nuniform vec3 uShirt, uPants, uShoes, uGlove, uSkin;\nuniform vec4 uCut;\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  { vec3 p = vBind / uCut.w; float ax = abs(p.x);
    float lum = clamp(dot(diffuseColor.rgb, vec3(.3, .59, .11)) * 3.2, .78, 1.3);   // limita: a cueca escura da textura não vira faixa na roupa
    vec3 col = diffuseColor.rgb * uSkin;
    if (p.y < .1 && ax < .3) col = uShoes * lum;
    else if (p.y < .985 && p.y > uCut.y && ax < .3) col = uPants * lum;
    else if (p.y >= .985 && ax < uCut.x && !(p.y > 1.455 && ax < .09)) col = uShirt * lum;
    else if (ax > uCut.z) col = uGlove * lum;
    diffuseColor.rgb = col; }`);
    };
    m.customProgramCacheKey = () => 'favelaOutfit';
    return (matCache[key] = m);
  }
  const hairMats = {};
  function hairMat(color, skinned) {   // sobrancelha é malha com esqueleto (skinning); cabelo/barba são malhas presas ao osso da cabeça
    const k = color + (skinned ? '|s' : '');
    return hairMats[k] || (hairMats[k] = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), map: shared.hairTex, side: THREE.DoubleSide, skinning: !!skinned }));
  }
  const accMats = {}, accMat = c => accMats[c] || (accMats[c] = new THREE.MeshLambertMaterial({ color: c }));

  /* ---------- cabeça: cabelo, capacete, boné, touca (no espaço do modelo, presos ao osso Head) ---------- */
  function hash(s) { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }
  function dressHead(sk, body, kind, o) {
    const hb = body.skeleton.bones.find(b => b.name === 'Head'); if (!hb) return;
    const holder = new THREE.Group(); holder.matrixAutoUpdate = false;
    holder.matrix.copy(body.skeleton.boneInverses[body.skeleton.bones.indexOf(hb)]); hb.add(holder);
    const top = kind === 'female' ? 1.77 : 1.81, cy = top - .11, add = (geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); holder.add(m); return m; };
    const dome = f => new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * f);
    if (o.helmet) {
      const hm = accMat(o.helmetColor || '#10151f');
      add(dome(.56), hm, 0, cy + .005, -.005, .128, .13, .14);
      add(new THREE.BoxGeometry(.2, .03, .02), hm, 0, cy + .045, .125);                   // aba frontal
    } else {
      const styles = kind === 'female' ? ['Hair_Long', 'Hair_Buns', 'Hair_BuzzedFemale'] : ['Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Buzzed'];
      const st = o.hairStyle || styles[hash(o.name || o.shirt || '') % styles.length], src = shared.hair[st];
      if (src && !o.touca) { const h = new THREE.Mesh(src.geometry, hairMat(o.hair || '#2a1d14')); h.matrixAutoUpdate = false; h.matrix.copy(src.matrix); holder.add(h); }
      if (kind === 'male' && !o.bandana && hash(o.name || o.skin || '') % 3 === 0 && shared.hair.Hair_Beard) { const b = new THREE.Mesh(shared.hair.Hair_Beard.geometry, hairMat(o.hair || '#2a1d14')); b.matrixAutoUpdate = false; b.matrix.copy(shared.hair.Hair_Beard.matrix); holder.add(b); }
      if (o.touca) add(dome(.58), accMat(o.touca), 0, cy + .005, -.008, .122, .13, .133);
      if (o.cap) { const cm = accMat(o.cap); add(dome(.5), cm, 0, cy + .02, -.005, .12, .1, .13); add(new THREE.BoxGeometry(.16, .012, .1), cm, 0, cy + .025, -.15); }   // boné de aba virada para trás
      if (o.bandana) add(new THREE.SphereGeometry(1, 14, 8, -Math.PI * .05, Math.PI * 1.1, Math.PI * .5, Math.PI * .3), accMat(o.bandana), 0, cy - .02, .005, .1, .115, .112);   // pano cobrindo nariz e boca (frente = +Z)
    }
    if (o.chain) { const ch = new THREE.Mesh(new THREE.TorusGeometry(.1, .008, 6, 18), accMat('#d9b238')); ch.rotation.x = Math.PI / 2 - .35; ch.position.set(0, top - .36, .04); ch.scale.set(1, 1.15, 1);
      const sp = body.skeleton.bones.find(b => b.name === 'spine_03'); if (sp) { const h2 = new THREE.Group(); h2.matrixAutoUpdate = false; h2.matrix.copy(body.skeleton.boneInverses[body.skeleton.bones.indexOf(sp)]); sp.add(h2); h2.add(ch); } }
  }

  /* ---------- troca do boneco procedural pelo personagem ---------- */
  function upgrade(r) {
    const o = r.userData.opt || {}, kind = o.female ? 'female' : 'male';
    if (!tpl[kind]) { if (waiting[kind].indexOf(r) < 0) waiting[kind].push(r); if (started) loadKind(kind); return; }
    if (r.userData.sk) return;
    const t = tpl[kind], sk = THREE.SkeletonUtils.clone(t.scene);
    sk.rotation.y = Math.PI;                                   // o modelo olha para +Z; o boneco do jogo, para -Z
    let body = null;
    sk.traverse(m => { if (!m.isSkinnedMesh) return; m.frustumCulled = false; m.castShadow = !low();
      if (m.name === t.body) { body = m; m.material = outfitMat(kind, o); }
      else if (m.name === t.brows) m.material = hairMat(o.hair || '#2a1d14', true); });
    dressHead(sk, body, kind, o);
    // esconde a malha procedural (hitboxes já são invisíveis; o soquete da arma continua)
    const mount = r.userData.hand;
    r.traverse(m => { if (m.isMesh && !m.userData.hitZone && m.name.indexOf('hitbox') < 0) { let p = m; while (p && p !== mount) p = p.parent; if (!p) m.visible = false; } });
    r.add(sk);
    const mixer = new THREE.AnimationMixer(sk), acts = {};
    for (const k in shared.clips) { const c = shared.clips[k]; if (!c) continue; const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0); acts[k] = a; }
    const B = n => body.skeleton.bones.find(b => b.name === n);
    const P = r.userData.parts, handOf = el => el.children.find(c => c.isGroup) || el;
    r.userData.sk = { root: sk, mixer, acts,
      spine: B('spine_03'), neck: B('neck_01'),
      R: { ua: B('upperarm_r'), la: B('lowerarm_r'), hd: B('hand_r'), el: P.elbowR, wr: handOf(P.elbowR) },
      L: { ua: B('upperarm_l'), la: B('lowerarm_l'), hd: B('hand_l'), el: P.elbowL, wr: handOf(P.elbowL) } };
    mixer.update(Math.random() * 2);   // começa parado (e fora de sincronia com os outros)
  }

  /* ---------- por quadro: mistura das animações + mira + braços na arma ---------- */
  const _a = new V3(), _b = new V3(), _c = new V3(), _t = new V3(), _p = new V3(), _e = new V3(), _d = new V3(), _q = new Q(), _q2 = new Q(), _ax = new V3();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rotWorld(bone, q) {           // aplica rotação de mundo q ao osso (mantendo o pai)
    bone.getWorldQuaternion(_q2); _q2.premultiply(q);
    bone.parent.getWorldQuaternion(_q).invert(); bone.quaternion.copy(_q.multiply(_q2)); bone.updateMatrixWorld(true);
  }
  function aimBone(bone, child, target) { // gira o osso para que o filho aponte para target
    bone.getWorldPosition(_a); child.getWorldPosition(_b);
    _d.subVectors(_b, _a).normalize(); _e.subVectors(target, _a).normalize();
    rotWorld(bone, _q.setFromUnitVectors(_d, _e).clone());
  }
  function armIK(s, wrist, pole) {
    s.ua.getWorldPosition(_a); s.la.getWorldPosition(_b); s.hd.getWorldPosition(_c);
    const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
    _d.subVectors(wrist, _a); const D = clamp(_d.length(), .05, l1 + l2 - .002); _d.normalize();
    const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    _p.subVectors(pole, _a); _p.addScaledVector(_d, -_p.dot(_d)); if (_p.lengthSq() < 1e-8) _p.set(0, -1, 0); _p.normalize();
    const E = new V3().copy(_a).addScaledVector(_d, a).addScaledVector(_p, h), T = new V3().copy(_a).addScaledVector(_d, D);
    aimBone(s.ua, s.la, E); aimBone(s.la, s.hd, T);
  }
  function lin(x, pts) { // pesos por velocidade (interpolação entre pontos vizinhos)
    const w = pts.map(() => 0); if (x <= pts[0]) { w[0] = 1; return w; } if (x >= pts[pts.length - 1]) { w[w.length - 1] = 1; return w; }
    for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1]) { const f = (x - pts[i]) / (pts[i + 1] - pts[i]); w[i] = 1 - f; w[i + 1] = f; break; }
    return w;
  }
  function drive(r, dt, st) {
    const k = r.userData.sk, s = r.userData.s, A = k.acts; if (!s) return;
    const spd = s.spd, c = s.crouch, air = s.air, dir = s.fwd < 0 ? -1 : 1, stand = (1 - c) * (1 - air);
    const [wi, ww, wj, ws] = lin(spd, [0, SPEED.walk, SPEED.jog, SPEED.sprint]), m = clamp(spd / SPEED.cFwd, 0, 1);
    const W = { idle: wi * stand, walk: ww * stand, jog: wj * stand, sprint: ws * stand, cIdle: (1 - m) * c * (1 - air), cFwd: m * c * (1 - air), jump: air };
    for (const n in A) A[n].setEffectiveWeight(W[n] || 0);
    if (A.walk) A.walk.timeScale = dir * clamp(spd / SPEED.walk, .6, 1.5);
    if (A.jog) A.jog.timeScale = dir * clamp(spd / SPEED.jog, .7, 1.4);
    if (A.sprint) A.sprint.timeScale = clamp(spd / SPEED.sprint, .8, 1.3);
    if (A.cFwd) A.cFwd.timeScale = dir * clamp(spd / SPEED.cFwd, .6, 1.6);
    k.mixer.update(dt);
    k.root.updateMatrixWorld(true);
    // mira: inclina peito e pescoço (eixo X do boneco, em coordenadas de mundo)
    const pit = clamp(st.pitch || 0, -1.2, 1.2);
    if (pit && k.spine) { _ax.set(1, 0, 0).applyQuaternion(r.getWorldQuaternion(_q)); rotWorld(k.spine, new Q().setFromAxisAngle(_ax, pit * .45)); if (k.neck) rotWorld(k.neck, new Q().setFromAxisAngle(_ax, pit * .3)); }
    // braços: mãos onde o boneco procedural segura a arma (com arma); sem arma, fica a animação
    if (st.armed !== false) {
      r.updateMatrixWorld(true);
      armIK(k.R, k.R.wr.getWorldPosition(_t).clone(), k.R.el.getWorldPosition(new V3()));
      armIK(k.L, k.L.wr.getWorldPosition(_t).clone(), k.L.el.getWorldPosition(new V3()));
    }
  }

  /* ---------- liga no construtor dos bonecos ---------- */
  const orig = GA.buildHumanoid || GA.buildPlayer;
  const build = function (_T, opt) {
    const r = orig(_T, opt); r.userData.opt = Object.assign({}, opt || {});
    const an = r.userData.animate;
    r.userData.animate = function (dt, st) { an(dt, st); if (r.userData.sk && r.visible) drive(r, Math.min(dt || .016, .1), st || {}); };   // invisível (morto/1ª pessoa): não anima
    upgrade(r);
    return r;
  };
  GA.buildPlayer = GA.buildHumanoid = build;
  // começa a baixar depois que o jogo abriu (não compete com o carregamento inicial)
  const start = () => setTimeout(() => { started = true; loadKind('male'); if (waiting.female.length) loadKind('female'); }, 400);
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
  window.FavelaChars = { loadKind, ready: () => !!tpl.male };
})();
