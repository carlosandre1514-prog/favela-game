/* Personagens 3D (Quaternius Universal Base Characters, licença CC0) com animação própria, feita por código.
   O boneco procedural (GameAssets3D.buildHumanoid) continua mandando no jogo: hitboxes, soquete da arma, IK dos
   braços até a arma e estado (velocidade, agachar, pulo, mira). O corpo com esqueleto (SkinnedMesh) é desenhado no lugar:
   - pernas: passada procedural — cada pé tem um alvo que vai e volta na direção do movimento (frente, lado, costas,
     diagonais), sobe na fase de balanço e o joelho dobra por IK; correr = passada maior e mais rápida, tronco inclinado;
     agachado = quadril baixo (joelhos dobram sozinhos); pulo = pernas recolhidas;
   - braços: IK de 2 ossos até as mãos do boneco procedural (as duas mãos na arma), mãos viradas pela arma;
   - roupa: shader que pinta camisa/calça/tênis/luva por região do corpo, com as cores de cada skin. */
(function () {
  const GA = window.GameAssets3D, THREE = window.THREE;
  if (!GA || !THREE || !THREE.GLTFLoader || !THREE.SkeletonUtils) return;
  const BASE = 'assets/chars/';
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
    sharedP = Promise.all([load('hair.glb'), new Promise(ok => new THREE.TextureLoader().load(BASE + 'hair.webp', ok, undefined, () => ok(null)))])
      .then(([hr, ht]) => {
        const hair = {}; hr.scene.updateMatrixWorld(true);
        hr.scene.traverse(o => { if (o.isMesh) { const m = o.clone(); m.matrixAutoUpdate = false; m.matrix.copy(o.matrixWorld); hair[o.name || o.parent.name] = m; } });
        if (ht) { ht.flipY = false; ht.encoding = THREE.sRGBEncoding; }
        return (shared = { hair, hairTex: ht });
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
    const B = n => body.skeleton.bones.find(b => b.name === n);
    const P = r.userData.parts, handOf = el => el.children.find(c => c.isGroup) || el;
    // pose de origem (T): cada quadro parte dela; posições/rotações de referência no espaço do boneco
    const rest = body.skeleton.bones.map(b => [b, b.quaternion.clone()]);
    r.updateMatrixWorld(true);
    const inR = (o, v) => r.worldToLocal(o.getWorldPosition(v || new V3()));
    const rq = r.getWorldQuaternion(new Q()).invert(), relQ = b => rq.clone().multiply(b.getWorldQuaternion(new Q()));
    const leg = sd => { const th = B('thigh_' + sd), ca = B('calf_' + sd), ft = B('foot_' + sd);
      return { th, ca, ft, ik: { ua: th, la: ca, hd: ft }, ftQ: relQ(ft), foot0: inR(ft), right: sd === 'r' }; };
    r.userData.sk = { root: sk, rest, phase: Math.random() * 6, acc: 0, n: (Math.random() * 6) | 0, pel0: inR(B('pelvis')), lean: 0,
      LL: leg('l'), LR: leg('r'),
      pelvis: B('pelvis'), sp1: B('spine_01'), sp2: B('spine_02'), spine: B('spine_03'), neck: B('neck_01'),
      R: { ua: B('upperarm_r'), la: B('lowerarm_r'), hd: B('hand_r'), sh: P.armR, el: P.elbowR, wr: handOf(P.elbowR), right: true },
      L: { ua: B('upperarm_l'), la: B('lowerarm_l'), hd: B('hand_l'), sh: P.armL, el: P.elbowL, wr: handOf(P.elbowL), right: false } };
    curlFingers(body); r.userData.sk.fingers = body.skeleton.bones.filter(b => /^(index|middle|ring|pinky|thumb)_/.test(b.name));
    r.userData.sk.rest = rest.filter(([b]) => !/^(index|middle|ring|pinky|thumb)_/.test(b.name));   // dedos ficam fechados
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
    orientHand(R, _F.copy(fwd).multiplyScalar(.55).addScaledVector(right, -.6).addScaledVector(up, -.5), _P.copy(right).negate());   // punho: palma pela direita, dedos envolvem o punho para a esquerda
    if (across) orientHand(L, _F.copy(right).multiplyScalar(.85).addScaledVector(up, .45).addScaledVector(fwd, .3), _P.copy(up).multiplyScalar(.8).addScaledVector(right, .35));   // 1ª pessoa: mão atravessa por baixo do guarda-mão e os dedos fecham por cima
    else orientHand(L, _F.copy(fwd).addScaledVector(right, .12).addScaledVector(up, .05), _P.copy(up).addScaledVector(right, .3));     // 3ª pessoa: palma por baixo, dedos sobem pelo lado esquerdo
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

  /* ---------- por quadro: animação própria (passada procedural) + mira + mãos na arma ----------
     Espaço do boneco (r): frente = -Z, direita = +X, cima = +Y. */
  let camRef = null;
  const _fw = new V3(), _mv = new V3(), _ft = new V3(), _hp = new V3(), _kn = new V3(), _tmpQ = new Q(), _tq = new Q();
  function legIK(L, foot, swing, r, rq) {
    _ft.copy(foot); r.localToWorld(_ft);                               // alvo do tornozelo -> mundo
    L.th.getWorldPosition(_kn); _kn.addScaledVector(_fw.set(L.right ? .2 : -.2, -.3, -1).applyQuaternion(rq), 1);   // joelho: para a frente
    armIK(L.ik, _ft, _kn);
    // pé paralelo ao chão (alinhado ao corpo); no balanço a ponta sobe um pouco
    _tq.copy(rq).multiply(L.ftQ);
    if (swing > 0) _tq.premultiply(_tmpQ.setFromAxisAngle(_ax, swing * .45));
    L.ft.parent.getWorldQuaternion(_q3).invert(); L.ft.quaternion.copy(_q3.multiply(_tq)); L.ft.updateMatrixWorld(true);
  }
  function drive(r, dt, st) {
    const k = r.userData.sk, s = r.userData.s; if (!s) return;
    // nível de detalhe pela distância da câmera: longe anima menos vezes e sem ajuste fino
    let far = 0; if (camRef) { r.getWorldPosition(_w); const d2 = _w.distanceToSquared(camRef.position); far = d2 > 3600 ? 2 : d2 > 900 ? 1 : 0; }
    k.acc += dt; k.n++;
    if (far === 2 && k.n % 4) return; if (far === 1 && k.n % 2) return;
    dt = Math.min(k.acc, .2); k.acc = 0;
    const vf = st.vf || 0, vs = st.vs || 0, sp = Math.hypot(vf, vs), c = s.crouch, air = s.air, run = clamp((sp - 4.6) / 2, 0, 1);
    // 1) volta à pose de origem
    for (const [b, q] of k.rest) b.quaternion.copy(q);
    r.getWorldQuaternion(_q); const rq = _q.clone();
    _up.set(0, 1, 0).applyQuaternion(rq); _ax.set(1, 0, 0).applyQuaternion(rq);
    // 2) fase da passada: meia passada S cresce com a velocidade; cadência = pi*v/(2S)
    const moving = sp > .25, amp = clamp(sp / 1.2, 0, 1) * (1 - air);
    const S = clamp(.16 + .055 * sp, .16, .5) * (1 - c * .35);
    if (moving && !air) k.phase += dt * Math.PI * sp / (2 * S);
    else k.phase += dt * 1.2 * (1 - amp);   // parado: respiração lenta
    const p = k.phase;
    _mv.set(vs, 0, -vf); if (sp > .01) _mv.multiplyScalar(1 / sp);   // direção do movimento no espaço do boneco
    // 3) quadril: altura (agachar, quique da passada, pulo) e balanço
    const bob = Math.abs(Math.cos(p)) * .035 * amp * (1 + run * .6), breath = Math.sin(p * 1.0) * .004 * (1 - amp);
    const pelY = k.pel0.y - .36 * c - bob + .03 * amp * (1 - c) + breath - air * .05;
    _hp.set(k.pel0.x + Math.sin(p) * .015 * amp, pelY, k.pel0.z - run * .06); r.localToWorld(_hp);
    k.pelvis.position.copy(k.pelvis.parent.worldToLocal(_hp));
    k.pelvis.updateMatrixWorld(true);
    rotWorld(k.pelvis, _tq.setFromAxisAngle(_up, Math.sin(p) * .08 * amp).clone());
    // 4) pernas: pés vão e voltam na direção do movimento; sobem no balanço
    if (far < 2) {
      for (const [L, off] of [[k.LL, 0], [k.LR, Math.PI]]) {
        const ph = p + off, cs = Math.cos(ph), lift = Math.max(0, -Math.sin(ph)) * amp;
        _e.set(L.foot0.x * (1 + c * .3), L.foot0.y, L.foot0.z + c * .1);                 // pé de apoio (agachado: base mais larga)
        _e.addScaledVector(_mv, cs * S * amp); _e.y += lift * (.09 + .1 * run);            // vai/volta na direção do movimento; sobe no balanço
        if (air) { _e.y += .3 * air + (L.right ? .06 : 0); _e.z -= .1 * air; }              // pulo: pernas recolhidas
        legIK(L, _e, lift, r, rq);
      }
    }
    // 5) tronco: inclina correndo/agachado, contra-gira com a passada, segue a mira
    const pit = clamp(st.pitch || 0, -1.2, 1.2);
    k.lean += ((run * .28 + c * .22 + amp * .05) - k.lean) * (1 - Math.exp(-dt * 8));
    rotWorld(k.sp1, _tq.setFromAxisAngle(_ax, -k.lean * .5).clone(), true);
    rotWorld(k.sp2, _tq.setFromAxisAngle(_up, -Math.sin(p) * .07 * amp).clone(), true);
    rotWorld(k.spine, _tq.setFromAxisAngle(_ax, pit * .45 - k.lean * .3).clone());
    if (k.neck) rotWorld(k.neck, _tq.setFromAxisAngle(_ax, pit * .3 + k.lean * .6).clone());
    if (st.armed === false || far === 2) {   // sem arma (ou muito longe): braços para baixo
      _fw.set(0, 0, -1).applyQuaternion(rq);
      rotWorld(k.R.ua, _tq.setFromAxisAngle(_fw, 1.25).clone()); rotWorld(k.L.ua, _tq.setFromAxisAngle(_fw, -1.25).clone());
      return;
    }
    // 6) braços: as duas mãos onde o boneco procedural segura a arma; mãos viradas pela arma
    k.R.sh.updateMatrixWorld(true); k.L.sh.updateMatrixWorld(true);
    armIK(k.R, k.R.wr.getWorldPosition(_w), k.R.el.getWorldPosition(_pl));
    armIK(k.L, k.L.wr.getWorldPosition(_w), k.L.el.getWorldPosition(_pl));
    const mt = r.userData.hand; mt.getWorldQuaternion(_q);
    gripHands(k.R, k.L, _F.set(0, 0, -1).applyQuaternion(_q).clone(), _U.set(0, 1, 0).applyQuaternion(_q).clone(), _R.set(1, 0, 0).applyQuaternion(_q).clone());
  }

  /* ---------- 1ª pessoa: os braços do próprio personagem segurando a arma ---------- */
  let fp = null;
  function fpArms(scene, cam, gun, opt, show, aimK) {
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
      // como em todo FPS, os braços da câmera são um pouco maiores (x1,3) e os ombros ficam logo abaixo/à frente do olho,
      // senão a mão da frente não alcança o guarda-mão; as mãos voltam a ~1,1x (proporção com a arma, que é 15% maior)
      sk.scale.setScalar(1.3); sk.rotation.y = Math.PI; cam.add(sk);
      curlFingers(body, 1);
      for (const sd of ['l', 'r']) B('hand_' + sd).scale.setScalar(.85);   // mãos um pouco menores (proporção com a arma)
      if (!cam.parent) scene.add(cam);
    }
    // ombros: na cintura ficam abaixo/à frente do olho; mirando vão para trás (coronha no ombro, rosto na arma)
    const a = clamp(aimK || 0, 0, 1), FPS = 1.3;
    fp.sk.position.set(.05 - .04 * a, -.25 - 1.45 * FPS + .06 * a, -.3 + .34 * a);
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
