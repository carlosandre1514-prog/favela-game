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
  function outfitMat(kind, o, onlyArms) {
    const police = !!(o.police || o.helmet), key = [kind, o.skin, o.shirt, o.shorts, o.gear, o.sleeveless, police, !!onlyArms].join('|');
    if (matCache[key]) return matCache[key];
    const t = tpl[kind], sc = t.h / 1.81, sk = new THREE.Color(o.skin || '#b07850');
    const U = {
      uShirt: { value: linC(o.shirt || '#34443b') }, uPants: { value: linC(o.shorts || '#202a26') },
      uShoes: { value: linC(police ? '#121315' : '#e9e7e0') }, uGlove: { value: linC(o.gear || '#1c1f24') },
      uSkin: { value: new THREE.Vector3(Math.min(1.25, sk.r / .69), Math.min(1.25, sk.g / .47), Math.min(1.25, sk.b / .33)) },   // tom médio da pele da textura ≈ (.69,.47,.33)
      uCut: { value: new THREE.Vector4(o.sleeveless ? .19 : police ? .67 : .37, police ? .1 : .52, police ? .67 : 9, sc) },   // manga até x, calça até y, luva a partir de x, escala
      uArms: { value: onlyArms ? 1 : 0 }   // 1ª pessoa: desenha só os braços
    };
    const m = new THREE.MeshLambertMaterial({ map: t.map, skinning: true });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vBind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBind = position;');
      sh.fragmentShader = 'varying vec3 vBind;\nuniform vec3 uShirt, uPants, uShoes, uGlove, uSkin;\nuniform vec4 uCut;\nuniform float uArms;\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  { vec3 p = vBind / uCut.w; float ax = abs(p.x);
    if (uArms > .5 && (ax < .21 || p.y < 1.2)) discard;
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
    {   // sem capacete (pedido): policiais também mostram o cabelo
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
    // remove as malhas do boneco procedural (ficam só os grupos/articulações que mandam no esqueleto,
    // as hitboxes e o soquete da arma): menos objetos para atualizar e desenhar a cada quadro
    const mount = r.userData.hand, drop = [];
    r.traverse(m => { if (m.isMesh && !m.userData.hitZone && m.name.indexOf('hitbox') < 0) { let p = m; while (p && p !== mount) p = p.parent; if (!p) drop.push(m); } });
    for (const m of drop) m.parent.remove(m);
    r.add(sk);
    const mixer = new THREE.AnimationMixer(sk), acts = {};
    for (const k in shared.clips) { const c = shared.clips[k]; if (!c) continue; const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0); acts[k] = a; }
    const B = n => body.skeleton.bones.find(b => b.name === n);
    const P = r.userData.parts, handOf = el => el.children.find(c => c.isGroup) || el;
    r.userData.sk = { root: sk, mixer, acts, yaw: 0, acc: 0, n: (Math.random() * 6) | 0,
      pelvis: B('pelvis'), sp1: B('spine_01'), sp2: B('spine_02'), spine: B('spine_03'), neck: B('neck_01'),
      R: { ua: B('upperarm_r'), la: B('lowerarm_r'), hd: B('hand_r'), sh: P.armR, el: P.elbowR, wr: handOf(P.elbowR), right: true },
      L: { ua: B('upperarm_l'), la: B('lowerarm_l'), hd: B('hand_l'), sh: P.armL, el: P.elbowL, wr: handOf(P.elbowL), right: false } };
    curlFingers(body);
    mixer.update(Math.random() * 2);   // começa parado (e fora de sincronia com os outros)
  }

  /* ---------- ferramentas de ossos (sem criar objetos por quadro) ---------- */
  const _a = new V3(), _b = new V3(), _c = new V3(), _p = new V3(), _e = new V3(), _d = new V3(), _E = new V3(), _T = new V3(),
    _w = new V3(), _pl = new V3(), _q = new Q(), _q2 = new Q(), _q3 = new Q(), _ax = new V3(), _up = new V3(), _m4 = new THREE.Matrix4(),
    _X = new V3(), _Y = new V3(), _Z = new V3(), _F = new V3(), _R = new V3(), _U = new V3(), _P = new V3();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rotWorld(bone, q, noUpdate) {     // aplica rotação de mundo q ao osso (mantendo o pai)
    bone.getWorldQuaternion(_q2); _q2.premultiply(q);
    bone.parent.getWorldQuaternion(_q3).invert(); bone.quaternion.copy(_q3.multiply(_q2)); if (!noUpdate) bone.updateMatrixWorld(true);
  }
  function aimBone(bone, child, target) {    // gira o osso para que o filho aponte para target
    bone.getWorldPosition(_a); child.getWorldPosition(_b);
    _d.subVectors(_b, _a).normalize(); _e.subVectors(target, _a).normalize();
    rotWorld(bone, _q.setFromUnitVectors(_d, _e));
  }
  function armIK(s, wrist, pole) {
    s.ua.getWorldPosition(_a); s.la.getWorldPosition(_b); s.hd.getWorldPosition(_c);
    const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
    _d.subVectors(wrist, _a); const D = clamp(_d.length(), .05, l1 + l2 - .002); _d.normalize();
    const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    _p.subVectors(pole, _a); _p.addScaledVector(_d, -_p.dot(_d)); if (_p.lengthSq() < 1e-8) _p.set(0, -1, 0); _p.normalize();
    _E.copy(_a).addScaledVector(_d, a).addScaledVector(_p, h); _T.copy(_a).addScaledVector(_d, D);
    aimBone(s.ua, s.la, _E); aimBone(s.la, s.hd, _T);
  }
  /* mão: dedos (eixo Y do osso) na direção F e palma virada para P. No esqueleto UE a palma da mão
     direita é o -X do osso e a da esquerda o +X; o lado do indicador/polegar é +Z nas duas. */
  function orientHand(s, F, P) {
    _Y.copy(F).normalize(); _X.copy(P).multiplyScalar(s.right ? -1 : 1); _X.addScaledVector(_Y, -_X.dot(_Y)).normalize();
    _Z.crossVectors(_X, _Y);
    _q.setFromRotationMatrix(_m4.makeBasis(_X, _Y, _Z));
    s.hd.parent.getWorldQuaternion(_q3).invert(); s.hd.quaternion.copy(_q3.multiply(_q)); s.hd.updateMatrixWorld(true);
  }
  // pegada do fuzil a partir dos eixos da arma (frente, cima, direita do atirador)
  function gripHands(R, L, fwd, up, right, across) {
    orientHand(R, _F.copy(fwd).addScaledVector(up, -.45).addScaledVector(right, -.15), _P.copy(right).negate().addScaledVector(fwd, .25));   // punho: palma envolve pela direita
    orientHand(L, _F.copy(fwd).addScaledVector(right, .12 + (across || 0)).addScaledVector(up, .05), _P.copy(up).addScaledVector(right, .3));                // guarda-mão: palma por baixo, dedos sobem pelo lado esquerdo
  }
  // dedos fechados em volta da arma (as animações não mexem nos dedos, então basta uma vez)
  function curlFingers(body, k) {
    k = k || 1;
    for (const b of body.skeleton.bones) {
      const m = /^(index|middle|ring|pinky)_0([123])_/.exec(b.name); if (m) { b.rotation.x += (m[2] === '1' ? .9 : .75) * k; continue; }
      if (/^thumb_0[23]_/.test(b.name)) b.rotation.x += .35 * k;
    }
  }
  function lin(x, pts) { // pesos por velocidade (interpolação entre pontos vizinhos)
    const w = pts.map(() => 0); if (x <= pts[0]) { w[0] = 1; return w; } if (x >= pts[pts.length - 1]) { w[w.length - 1] = 1; return w; }
    for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1]) { const f = (x - pts[i]) / (pts[i + 1] - pts[i]); w[i] = 1 - f; w[i + 1] = f; break; }
    return w;
  }

  /* ---------- por quadro: animação, pernas na direção do movimento, mira e mãos na arma ---------- */
  let camRef = null;
  function drive(r, dt, st) {
    const k = r.userData.sk, s = r.userData.s, A = k.acts; if (!s) return;
    // nível de detalhe pela distância da câmera: longe anima menos vezes e sem ajuste fino
    let far = 0; if (camRef) { r.getWorldPosition(_w); const d2 = _w.distanceToSquared(camRef.position); far = d2 > 3600 ? 2 : d2 > 900 ? 1 : 0; }
    k.acc += dt; k.n++;
    if (far === 2 && k.n % 4) return; if (far === 1 && k.n % 2) return;
    dt = Math.min(k.acc, .2); k.acc = 0;
    const vf = st.vf || 0, vs = st.vs || 0, spd = s.spd, c = s.crouch, air = s.air, stand = (1 - c) * (1 - air);
    // andando para trás: animação ao contrário; de lado: o quadril gira para o lado do movimento
    const moving = Math.hypot(vf, vs) > .35, back = vf < -.3, dir = back ? -1 : 1;
    const tYaw = !moving ? 0 : back ? clamp(Math.atan2(vs, -vf), -1.2, 1.2) : clamp(-Math.atan2(vs, Math.max(vf, 0)), -1.45, 1.45);
    k.yaw += (tYaw - k.yaw) * (1 - Math.exp(-dt * 10));
    const [wi, ww, wj, ws] = lin(spd, [0, SPEED.walk, SPEED.jog, SPEED.sprint]), m = clamp(spd / SPEED.cFwd, 0, 1);
    const W = { idle: wi * stand, walk: ww * stand, jog: wj * stand, sprint: ws * stand * (back ? 0 : 1), cIdle: (1 - m) * c * (1 - air), cFwd: m * c * (1 - air), jump: air };
    if (back) W.jog += ws * stand;
    for (const n in A) A[n].setEffectiveWeight(W[n] || 0);
    if (A.walk) A.walk.timeScale = dir * clamp(spd / SPEED.walk, .6, 1.5);
    if (A.jog) A.jog.timeScale = dir * clamp(spd / SPEED.jog, .7, 1.4);
    if (A.sprint) A.sprint.timeScale = clamp(spd / SPEED.sprint, .8, 1.3);
    if (A.cFwd) A.cFwd.timeScale = dir * clamp(spd / SPEED.cFwd, .6, 1.6);
    k.mixer.update(dt);
    if (far === 2) return;                         // longe: só a animação
    k.root.updateMatrixWorld(true);
    _up.set(0, 1, 0).applyQuaternion(r.getWorldQuaternion(_q)); _ax.set(1, 0, 0).applyQuaternion(_q);
    // quadril para o lado do movimento e tronco de volta para a mira
    if (Math.abs(k.yaw) > .01 && k.pelvis) {
      rotWorld(k.pelvis, _q2.setFromAxisAngle(_up, k.yaw).clone(), true);
      rotWorld(k.sp1, _q2.setFromAxisAngle(_up, -k.yaw * .45).clone(), true);
      rotWorld(k.sp2, _q2.setFromAxisAngle(_up, -k.yaw * .35).clone(), true);
      rotWorld(k.spine, _q2.setFromAxisAngle(_up, -k.yaw * .2).clone(), true);
      k.pelvis.updateMatrixWorld(true);
    }
    // mira: inclina peito e pescoço
    const pit = clamp(st.pitch || 0, -1.2, 1.2);
    if (pit && k.spine) { rotWorld(k.spine, _q2.setFromAxisAngle(_ax, pit * .45).clone()); if (k.neck) rotWorld(k.neck, _q2.setFromAxisAngle(_ax, pit * .3).clone()); }
    if (far || st.armed === false) return;        // médio: sem IK dos braços (fica a animação)
    // braços: mãos onde o boneco procedural segura a arma; mãos viradas pela orientação da arma
    k.R.sh.updateMatrixWorld(true); k.L.sh.updateMatrixWorld(true);
    armIK(k.R, k.R.wr.getWorldPosition(_w), k.R.el.getWorldPosition(_pl));
    armIK(k.L, k.L.wr.getWorldPosition(_w), k.L.el.getWorldPosition(_pl));
    const mt = r.userData.hand; mt.getWorldQuaternion(_q);
    gripHands(k.R, k.L, _F.set(0, 0, -1).applyQuaternion(_q).clone(), _U.set(0, 1, 0).applyQuaternion(_q).clone(), _R.set(1, 0, 0).applyQuaternion(_q).clone());
  }

  /* ---------- 1ª pessoa: os braços do próprio personagem segurando a arma ---------- */
  let fp = null;
  function fpArms(scene, cam, gun, opt, show) {
    opt = opt || {}; const kind = opt.female ? 'female' : 'male';
    const ok = show && gun && gun.userData.fpR && tpl[kind];
    if (!ok) { if (fp) fp.sk.visible = false; return false; }
    const key = kind + JSON.stringify(opt);
    if (!fp || fp.key !== key) {
      if (fp) fp.sk.parent && fp.sk.parent.remove(fp.sk);
      const sk = THREE.SkeletonUtils.clone(tpl[kind].scene); let body = null;
      sk.traverse(m => { if (m.isSkinnedMesh) { m.frustumCulled = false; if (m.name === tpl[kind].body) { body = m; m.material = outfitMat(kind, opt, true); } else m.visible = false; } });
      const B = n => body.skeleton.bones.find(b => b.name === n);
      fp = { key, sk, R: { ua: B('upperarm_r'), la: B('lowerarm_r'), hd: B('hand_r'), right: true }, L: { ua: B('upperarm_l'), la: B('lowerarm_l'), hd: B('hand_l'), right: false } };
      // como em todo FPS, os braços da câmera são maiores (x1,5) e os ombros ficam logo abaixo/à frente do olho,
      // senão a mão da frente não alcança o guarda-mão
      sk.scale.setScalar(1.65); sk.position.set(.04, -.27 - 1.45 * 1.65, -.24); sk.rotation.y = Math.PI; cam.add(sk);
      curlFingers(body, .55);   // 1ª pessoa: dedos menos fechados (mão aberta sob o guarda-mão)
      if (!cam.parent) scene.add(cam);
    }
    fp.sk.visible = true; fp.sk.updateMatrixWorld(true);
    gun.updateMatrixWorld(true);
    armIK(fp.R, gun.userData.fpR.getWorldPosition(_w), cam.localToWorld(_pl.set(.55, -.75, .05)));
    armIK(fp.L, gun.userData.fpL.getWorldPosition(_w), cam.localToWorld(_pl.set(-.35, -.8, -.1)));
    gun.getWorldQuaternion(_q);   // arma em 1ª pessoa: cano = +X local, cima = +Y, direita = +Z
    gripHands(fp.R, fp.L, _F.set(1, 0, 0).applyQuaternion(_q).clone(), _U.set(0, 1, 0).applyQuaternion(_q).clone(), _R.set(0, 0, 1).applyQuaternion(_q).clone(), .8);
    return true;
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
  window.FavelaChars = { loadKind, ready: () => !!tpl.male, fpArms, setCamera: c => { camRef = c; } };
})();
