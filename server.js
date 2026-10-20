'use strict';
/* Favela Game — servidor multiplayer.
   - Entrega o jogo (pasta /public) e aceita WebSocket em /ws, tudo na mesma porta.
   - Salas de até 16 jogadores, com código de 5 letras.
   - O servidor guarda vida/abates/mortes, calcula o dano pela arma e valida movimento e cadência (anti-trapaça).
   - Partida mata-mata: primeiro a chegar no limite de abates (ou o tempo acabar) vence; placar final e nova rodada automática. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 16;
const TICK_MS = 33;            // ~30 atualizações por segundo
const RESPAWN_MS = 3000;
const SPAWN_PROTECT_MS = 2000;  // invulnerável logo após renascer
const REGEN_DELAY_MS = 5000;    // sem levar dano por 5 s -> começa a regenerar
const REGEN_PER_SEC = 5;
const KILL_LIMIT = 20;          // abates para vencer a rodada
const MATCH_SECS = 600;         // duração máxima da rodada
const INTERMISSION_MS = 10000;  // tempo mostrando o placar final
const MAX_SPEED = 9;            // m/s horizontal (o jogo usa no máx. 7; folga para lag)
const MOVE_BURST = 14;          // metros acumulados que um lote de updates pode consumir
const MAX_VSPEED = 30;          // m/s vertical (pulo/queda/escada)
/* Mesmos valores do jogo: dano base, cadência (ms), balas por tiro e alcance (m). */
const WEAPONS = {
  rifle:   { dmg: 24, rate: 110, pellets: 1, range: 180 },
  sniper:  { dmg: 85, rate: 900, pellets: 1, range: 300 },
  shotgun: { dmg: 12, rate: 650, pellets: 8, range: 45 },
  smg:     { dmg: 13, rate: 75,  pellets: 1, range: 90 }
};
const HEAD_MULT = 2;
/* XP (o servidor só concede XP por eventos reais de partida contra outros jogadores) */
const XP_KILL = 100, XP_HEAD = 50, XP_PLAY = 100;
const XP_STREAK = { 3: [50, 'SEQUÊNCIA x3'], 5: [100, 'SEQUÊNCIA x5'], 7: [150, 'SEQUÊNCIA x7'], 10: [250, 'SEQUÊNCIA x10'] };
const XP_PLACE = [[500, 'VITÓRIA'], [250, 'PÓDIO 2º'], [150, 'PÓDIO 3º']];
const giveXp = (p, n, why) => { if (n > 0) send(p.ws, { t: 'xp', n, why }); };
const PUBLIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.css': 'text/css'
};

/* ---------- servidor HTTP (entrega o jogo) ---------- */
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  let file = path.normalize(path.join(PUBLIC, url === '/' ? 'index.html' : url));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('nao encontrado'); return; }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (path.basename(file) === 'sw.js' || ext === '.html') headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers); res.end(data);
  });
});

/* ---------- salas ---------- */
const rooms = new Map();   // code -> { code, players, state, endsAt, overUntil }
let nextId = 1;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { for (;;) { let c = ''; for (let i = 0; i < 5; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; if (!rooms.has(c)) return c; } };
const cleanName = n => String(n || 'Jogador').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 14) || 'Jogador';
const cleanLv = v => Math.max(1, Math.min(100, Math.floor(+v) || 1));
const num = (v, lim) => (typeof v === 'number' && isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : 0);
const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };
const broadcast = (room, obj, except) => { const s = JSON.stringify(obj); for (const p of room.players.values()) if (p.ws !== except && p.ws.readyState === 1) p.ws.send(s); };

function joinRoom(ws, room, name, lv) {
  if (room.players.size >= MAX_PLAYERS) { send(ws, { t: 'error', msg: 'Sala cheia (16 jogadores)' }); return; }
  const p = { id: nextId++, ws, name: cleanName(name), x: 0, y: 0, z: -60, yaw: 0, pit: 0, w: 'rifle', hp: 100, alive: true, k: 0, d: 0, lv: cleanLv(lv), streak: 0, lastShot: 0, respawnAt: 0,
             lastState: Date.now(), allow: MOVE_BURST, budget: 0, budgetAt: Date.now(), protectUntil: 0, lastDmg: 0, lastFix: 0 };
  ws.player = p; ws.room = room; room.players.set(p.id, p);
  send(ws, { t: 'joined', id: p.id, code: room.code, name: p.name, players: room.players.size });
  broadcast(room, { t: 'player_join', id: p.id, name: p.name }, ws);
}

function leaveRoom(ws) {
  const room = ws.room, p = ws.player; if (!room || !p) return;
  room.players.delete(p.id); ws.room = null; ws.player = null;
  broadcast(room, { t: 'player_leave', id: p.id });
  if (room.players.size === 0) rooms.delete(room.code);
}

/* ---------- mensagens do cliente ---------- */
function onMessage(ws, raw) {
  const now = Date.now();
  ws.msgCount = (ws.msgCount || 0) + 1;
  if (now - (ws.winStart || 0) > 1000) { ws.winStart = now; ws.msgCount = 1; }
  if (ws.msgCount > 140) return;                          // limite de mensagens por segundo
  let m; try { m = JSON.parse(raw); } catch (e) { return; }
  if (!m || typeof m.t !== 'string') return;

  if (m.t === 'create') {
    if (ws.room) return;
    const room = { code: newCode(), players: new Map(), state: 'play', endsAt: Date.now() + MATCH_SECS * 1000, overUntil: 0 }; rooms.set(room.code, room); joinRoom(ws, room, m.name, m.lv); return;
  }
  if (m.t === 'join') {
    if (ws.room) return;
    const room = rooms.get(String(m.code || '').toUpperCase().trim());
    if (!room) { send(ws, { t: 'error', msg: 'Sala não encontrada' }); return; }
    joinRoom(ws, room, m.name, m.lv); return;
  }
  const p = ws.player, room = ws.room; if (!p || !room) return;

  if (m.t === 'state') {                                 // posição e direção do jogador
    if (!p.alive) return;
    const nx = num(m.x, 400), ny = num(m.y, 200), nz = num(m.z, 400);
    const dt = Math.min(1, Math.max(0, (now - p.lastState) / 1000)); p.lastState = now;
    p.allow = Math.min(MOVE_BURST, p.allow + dt * MAX_SPEED);     // "crédito" de deslocamento, evita falso positivo com lag
    const dx = nx - p.x, dz = nz - p.z, dist = Math.hypot(dx, dz);
    if (dist <= p.allow) { p.allow -= dist; p.x = nx; p.z = nz; }
    else {                                                        // rápido demais: anda só até onde é permitido
      const f = p.allow / dist; p.x += dx * f; p.z += dz * f; p.allow = 0;
      if (now - p.lastFix > 500 && dist > MOVE_BURST + 4) { p.lastFix = now; send(ws, { t: 'fix', x: p.x, y: p.y, z: p.z }); }
    }
    const maxDy = MAX_VSPEED * Math.max(dt, .05) + 1;
    p.y = Math.abs(ny - p.y) <= maxDy ? ny : p.y + Math.sign(ny - p.y) * maxDy;
    p.yaw = num(m.yaw, 100); p.pit = num(m.pit, 3);
    if (typeof m.w === 'string' && WEAPONS[m.w]) p.w = m.w;
    return;
  }
  if (m.t === 'shot') {                                  // efeito visual do tiro (para os outros verem)
    if (!p.alive || room.state !== 'play') return;
    const W = WEAPONS[p.w] || WEAPONS.rifle;
    if (now - p.lastShot < W.rate * 0.6) return; p.lastShot = now;   // 60% da cadência real: tolera jitter de rede
    broadcast(room, { t: 'shot', id: p.id, ox: num(m.ox, 400), oy: num(m.oy, 200), oz: num(m.oz, 400), ex: num(m.ex, 600), ey: num(m.ey, 300), ez: num(m.ez, 600) }, ws); return;
  }
  if (m.t === 'hit') {                                   // cliente diz que acertou; o servidor decide o dano
    if (!p.alive || room.state !== 'play') return;
    const target = room.players.get(m.target);
    if (!target || !target.alive || target === p) return;
    const W = WEAPONS[p.w] || WEAPONS.rifle;
    // orçamento de acertos: cada tiro dá direito a `pellets` acertos; recarrega conforme a cadência da arma
    p.budget = Math.min(W.pellets * 3, p.budget + (now - p.budgetAt) / W.rate * W.pellets); p.budgetAt = now;
    if (p.budget < 1) return; p.budget -= 1;
    const dist = Math.hypot(p.x - target.x, p.y - target.y, p.z - target.z);
    if (dist > W.range + 6) return;                      // além do alcance da arma
    if (p.z < -37 || target.z < -37) return;             // zona segura: sem dano
    if (now < target.protectUntil) return;               // protegido logo após renascer
    const head = m.z === 'head';
    const dmg = Math.round(W.dmg * (head ? HEAD_MULT : 1));
    target.hp -= dmg; target.lastDmg = now;
    send(target.ws, { t: 'damage', from: p.id, hp: Math.max(0, target.hp) });
    send(ws, { t: 'hitmark', id: target.id, kill: target.hp <= 0, head, dmg });
    if (target.hp <= 0) {
      target.hp = 0; target.alive = false; target.d++; p.k++; target.respawnAt = now + RESPAWN_MS;
      broadcast(room, { t: 'kill', killer: p.id, victim: target.id, kn: p.name, vn: target.name, w: p.w, head });
      target.streak = 0; p.streak++;
      giveXp(p, XP_KILL, 'ABATE'); if (head) giveXp(p, XP_HEAD, 'TIRO NA CABEÇA');
      if (XP_STREAK[p.streak]) giveXp(p, XP_STREAK[p.streak][0], XP_STREAK[p.streak][1]);
      if (p.k >= KILL_LIMIT) endMatch(room, now);
    }
    return;
  }
  if (m.t === 'lv') { p.lv = cleanLv(m.lv); return; }
  if (m.t === 'ping') { send(ws, { t: 'pong', c: m.c }); return; }
  if (m.t === 'leave') { leaveRoom(ws); return; }
}

/* ---------- rodada ---------- */
const ranking = room => [...room.players.values()].sort((a, b) => b.k - a.k || a.d - b.d).map(p => ({ id: p.id, n: p.name, k: p.k, d: p.d, lv: p.lv }));
function endMatch(room, now) {
  if (room.state !== 'play') return;
  room.state = 'over'; room.overUntil = now + INTERMISSION_MS;
  const rank = ranking(room);
  broadcast(room, { t: 'match_end', winner: rank[0] ? rank[0].n : '', rank, next: INTERMISSION_MS / 1000 });
  if (room.players.size >= 2) {                         // bônus de fim de partida (só com 2+ jogadores reais)
    rank.forEach((r, i) => {
      const pl = room.players.get(r.id); if (!pl || r.k + r.d === 0) return;
      giveXp(pl, XP_PLAY, 'PARTIDA COMPLETA');
      if (i < 3 && r.k > 0) giveXp(pl, XP_PLACE[i][0], XP_PLACE[i][1]);
    });
  }
}
function startMatch(room, now) {
  room.state = 'play'; room.endsAt = now + MATCH_SECS * 1000;
  for (const p of room.players.values()) {
    p.k = 0; p.d = 0; p.streak = 0; p.hp = 100; p.alive = true; p.protectUntil = now + SPAWN_PROTECT_MS; p.allow = MOVE_BURST; p.lastState = now;
    p.x = (Math.random() - .5) * 12; p.y = 0; p.z = -67 + Math.random() * 8;
    send(p.ws, { t: 'respawn', x: p.x, z: p.z });
  }
  broadcast(room, { t: 'match_start', limit: KILL_LIMIT, secs: MATCH_SECS });
}

/* ---------- loop do servidor: rodada, reaparecimento, regeneração e envio do estado de todos ---------- */
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.state === 'play' && now >= room.endsAt) endMatch(room, now);
    else if (room.state === 'over' && now >= room.overUntil) startMatch(room, now);
    for (const p of room.players.values()) {
      if (!p.alive) {
        if (room.state === 'play' && now >= p.respawnAt) {
          p.alive = true; p.hp = 100; p.protectUntil = now + SPAWN_PROTECT_MS; p.allow = MOVE_BURST; p.lastState = now;
          p.x = (Math.random() - .5) * 12; p.y = 0; p.z = -67 + Math.random() * 8;
          send(p.ws, { t: 'respawn', x: p.x, z: p.z });
        }
      } else if (p.hp < 100 && now - p.lastDmg > REGEN_DELAY_MS) {
        p.hp = Math.min(100, p.hp + REGEN_PER_SEC * TICK_MS / 1000);
      }
    }
    const list = [];
    for (const p of room.players.values()) list.push({ id: p.id, n: p.name, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), pit: +p.pit.toFixed(2), w: p.w, hp: Math.round(p.hp), a: p.alive ? 1 : 0, k: p.k, d: p.d, lv: p.lv });
    broadcast(room, { t: 'snap', p: list, m: { s: room.state, tl: Math.max(0, Math.round(((room.state === 'play' ? room.endsAt : room.overUntil) - now) / 1000)), lim: KILL_LIMIT } });
  }
}, TICK_MS);

/* ---------- WebSocket ---------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096, perMessageDeflate: false });
wss.on('connection', ws => {
  ws.isAlive = true;
  try { ws._socket.setNoDelay(true); } catch (e) {}
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', data => onMessage(ws, data.toString()));
  ws.on('close', () => leaveRoom(ws));
  ws.on('error', () => leaveRoom(ws));
});
setInterval(() => {                                      // derruba conexões mortas
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
}, 15000);

server.listen(PORT, () => console.log('Favela Game online na porta ' + PORT));
