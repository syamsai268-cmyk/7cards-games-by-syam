'use strict';
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { WebSocket, WebSocketServer } = require('ws');

const rooms = new Map();
const allowedOrigins = new Set(['https://sevencards-games-by-syam.onrender.com']);
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, service: '7cards-room-relay', rooms: rooms.size }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 131072, perMessageDeflate: false });
const safeSend = (ws, data) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(data)); return true; } catch {}
  }
  return false;
};
const fail = (ws, message, code='ROOM_ERROR') => safeSend(ws, {type:'error', code, message});
function cleanup(ws) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  if (room.host === ws) {
    rooms.delete(ws.roomCode);
    for (const guest of room.guests.values()) {
      fail(guest, 'The room host left. Ask them to create another room.', 'HOST_LEFT');
      setTimeout(() => { try { guest.close(1000, 'Host left'); } catch {} }, 75);
    }
    room.guests.clear();
  } else if (ws.channel && room.guests.get(ws.channel) === ws) {
    room.guests.delete(ws.channel);
    safeSend(room.host, {type:'guest-close', channel:ws.channel});
  }
}
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    ws.close(1008, 'Origin not allowed'); return;
  }
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { fail(ws, 'Invalid message.'); return; }
    if (!msg || typeof msg !== 'object') return;
    const type = msg.type;
    if (type === 'create') {
      const code = String(msg.code || '').toUpperCase();
      if (ws.role || !/^[A-Z0-9]{6,8}$/.test(code)) return fail(ws, 'Invalid room code.');
      if (rooms.has(code)) return fail(ws, 'This code is already in use. Try creating the room again.', 'CODE_IN_USE');
      ws.role = 'host'; ws.roomCode = code;
      rooms.set(code, {host:ws, guests:new Map()});
      safeSend(ws, {type:'created', code});
      return;
    }
    if (type === 'join') {
      const code = String(msg.code || '').toUpperCase();
      if (ws.role || !/^[A-Z0-9]{6,8}$/.test(code)) return fail(ws, 'Invalid room code.');
      const room = rooms.get(code);
      if (!room || room.host.readyState !== WebSocket.OPEN) return fail(ws, 'Room not found. Ask the host to keep their lobby open and send a fresh invite.', 'ROOM_NOT_FOUND');
      if (room.guests.size >= 7) return fail(ws, 'This room is full (8 players maximum).', 'ROOM_FULL');
      ws.role = 'guest'; ws.roomCode = code; ws.channel = randomUUID();
      room.guests.set(ws.channel, ws);
      safeSend(room.host, {type:'guest-open',channel:ws.channel});
      return;
    }
    const room = rooms.get(ws.roomCode);
    if (!room) return fail(ws, 'Room expired. Create or join another room.', 'ROOM_EXPIRED');
    if (type === 'guest-ready' && ws.role === 'host') {
      const guest = room.guests.get(String(msg.channel || ''));
      if (guest) safeSend(guest, {type:'connected'});
      return;
    }
    if (type === 'relay' && msg.data && typeof msg.data === 'object') {
      if (JSON.stringify(msg.data).length > 64000) return fail(ws,'Message too large.');
      if (ws.role === 'guest') safeSend(room.host,{type:'data',channel:ws.channel,data:msg.data});
      else if (ws.role === 'host') safeSend(room.guests.get(String(msg.channel||'')),{type:'data',data:msg.data});
      return;
    }
    if (type === 'kick' && ws.role === 'host') {
      const guest = room.guests.get(String(msg.channel||''));
      if (guest) { fail(guest,'The host removed you from this room.','REMOVED'); guest.close(1000,'Removed'); }
    }
  });
  ws.on('close', () => cleanup(ws));
  ws.on('error', () => cleanup(ws));
});
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { try {ws.terminate();} catch{}; continue; }
    ws.alive = false;
    try {ws.ping();} catch{}
  }
}, 25000);
heartbeat.unref();
if (require.main === module) {
  server.listen(Number(process.env.PORT)||3000,'0.0.0.0',() => console.log('7Cards room relay ready on port '+server.address().port));
}
module.exports = {server,rooms,wss};
