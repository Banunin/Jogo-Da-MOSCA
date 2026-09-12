import crypto from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";

const slots = ["fly-1", "fly-2", "fly-3", "fly-4", "human-1"];
const maxConnections = Math.max(5, Number(process.env.MUSCA_MAX_CONNECTIONS || 200));
const maxRooms = Math.max(1, Number(process.env.MUSCA_MAX_ROOMS || 100));
const roomIdleMs = Math.max(10, Number(process.env.MUSCA_ROOM_IDLE_MINUTES || 120)) * 60_000;
const maxMessagesPerWindow = 240;
const rateWindowMs = 10_000;

const safeRoomName = (value) => String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
const roomKey = (value) => safeRoomName(value).toLocaleLowerCase("pt-BR");
const safePlayerName = (value) => String(value || "Jogador").trim().replace(/\s+/g, " ").slice(0, 24) || "Jogador";
const safeMapId = (value) => {
  const id = String(value || "bedroom").slice(0, 40);
  return ["bedroom", "kitchen", "garden"].includes(id) ? id : "bedroom";
};
const makePassword = (password, salt = crypto.randomBytes(16).toString("hex")) => ({
  salt,
  hash: crypto.scryptSync(String(password || "").slice(0, 64), salt, 32).toString("hex"),
});
const passwordMatches = (password, record) => {
  if (!record) return false;
  const incoming = crypto.scryptSync(String(password || "").slice(0, 64), record.salt, 32);
  const stored = Buffer.from(record.hash, "hex");
  return incoming.length === stored.length && crypto.timingSafeEqual(incoming, stored);
};

export function attachMultiplayer(httpServer) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024, perMessageDeflate: false });
  const clients = new Map();
  const rooms = new Map();
  let serial = 1;

  const json = (ws, data) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };
  const clientsInRoom = (room) => [...clients.values()].filter((client) => client.roomId === room.id);
  const slotSnapshot = (room) => slots.map((slotId) => {
    const entry = clientsInRoom(room).find((client) => client.slotId === slotId);
    return { slotId, ownerId: entry?.id ?? null, ownerName: entry?.name ?? null };
  });
  const peerSnapshot = (room) => clientsInRoom(room)
    .filter((client) => client.slotId)
    .map((client) => ({ clientId: client.id, slotId: client.slotId, name: client.name, pose: client.pose ?? null }));
  const roomPublic = (room) => ({ id: room.id, name: room.name, mapId: room.mapId, hostClientId: room.hostClientId });

  const touchRoom = (room) => { if (room) room.lastActivityAt = Date.now(); };

  const broadcastLobby = (room) => {
    if (!room) return;
    touchRoom(room);
    const packet = JSON.stringify({ type: "lobby", room: roomPublic(room), slots: slotSnapshot(room), peers: peerSnapshot(room) });
    for (const client of clientsInRoom(room)) if (client.ws.readyState === WebSocket.OPEN) client.ws.send(packet);
  };

  const leaveRoom = (client, notifySelf = true) => {
    if (!client.roomId) return;
    const room = rooms.get(client.roomId);
    const leavingWasHost = room?.hostClientId === client.id;
    client.roomId = null;
    client.slotId = null;
    client.pose = null;

    if (!room) {
      if (notifySelf) json(client.ws, { type: "room-left" });
      return;
    }

    if (leavingWasHost) {
      const others = clientsInRoom(room);
      rooms.delete(room.id);
      for (const peer of others) {
        peer.roomId = null;
        peer.slotId = null;
        peer.pose = null;
        json(peer.ws, { type: "room-closed", reason: "O anfitrião encerrou a sala." });
      }
    } else {
      if (notifySelf) json(client.ws, { type: "room-left" });
      broadcastLobby(room);
    }
  };

  const joinRoom = (client, room) => {
    if (client.roomId) leaveRoom(client, false);
    client.roomId = room.id;
    client.slotId = null;
    client.pose = null;
    touchRoom(room);
    json(client.ws, { type: "room-joined", room: roomPublic(room), slots: slotSnapshot(room), peers: peerSnapshot(room) });
    broadcastLobby(room);
  };

  wss.on("connection", (ws) => {
    if (clients.size >= maxConnections) {
      json(ws, { type: "room-error", message: "Servidor temporariamente cheio. Tente novamente em instantes." });
      ws.close(1013, "Server busy");
      return;
    }

    const id = `p${Date.now().toString(36)}-${serial++}`;
    const client = {
      id,
      ws,
      name: "Jogador",
      roomId: null,
      slotId: null,
      pose: null,
      alive: true,
      rateStart: Date.now(),
      rateCount: 0,
    };
    clients.set(ws, client);
    json(ws, { type: "welcome", clientId: id });

    ws.on("pong", () => { client.alive = true; });

    ws.on("message", (raw) => {
      const now = Date.now();
      if (now - client.rateStart > rateWindowMs) {
        client.rateStart = now;
        client.rateCount = 0;
      }
      client.rateCount += 1;
      if (client.rateCount > maxMessagesPerWindow) {
        ws.close(1008, "Rate limit");
        return;
      }

      let msg;
      try { msg = JSON.parse(String(raw)); } catch { return; }
      const current = clients.get(ws);
      if (!current || !msg || typeof msg.type !== "string") return;

      if (msg.type === "create-room") {
        const name = safeRoomName(msg.roomName);
        const key = roomKey(name);
        if (name.length < 2) { json(ws, { type: "room-error", message: "O nome da sala precisa ter pelo menos 2 caracteres." }); return; }
        if (rooms.has(key)) { json(ws, { type: "room-error", message: "Já existe uma sala com esse nome." }); return; }
        if (rooms.size >= maxRooms) { json(ws, { type: "room-error", message: "Limite de salas atingido. Tente novamente em instantes." }); return; }
        const password = String(msg.password || "");
        if (password.length < 1) { json(ws, { type: "room-error", message: "Defina uma senha para a sala." }); return; }
        current.name = safePlayerName(msg.playerName);
        const room = {
          id: key,
          name,
          mapId: safeMapId(msg.mapId),
          password: makePassword(password),
          hostClientId: current.id,
          createdAt: now,
          lastActivityAt: now,
        };
        rooms.set(key, room);
        joinRoom(current, room);
        return;
      }

      if (msg.type === "join-room") {
        const key = roomKey(msg.roomName);
        const room = rooms.get(key);
        if (!room) { json(ws, { type: "room-error", message: "Sala não encontrada." }); return; }
        if (!passwordMatches(msg.password, room.password)) { json(ws, { type: "room-error", message: "Senha incorreta." }); return; }
        if (clientsInRoom(room).length >= slots.length) { json(ws, { type: "room-error", message: "Esta sala está cheia." }); return; }
        current.name = safePlayerName(msg.playerName);
        joinRoom(current, room);
        return;
      }

      if (msg.type === "leave-room") { leaveRoom(current); return; }
      if (!current.roomId) { json(ws, { type: "room-error", message: "Entre em uma sala antes de escolher um personagem." }); return; }
      const room = rooms.get(current.roomId);
      if (!room) { leaveRoom(current); return; }
      touchRoom(room);

      if (msg.type === "claim" && slots.includes(msg.slotId)) {
        const occupied = clientsInRoom(room).some((other) => other !== current && other.slotId === msg.slotId);
        if (occupied) { json(ws, { type: "claim-denied", slotId: msg.slotId }); broadcastLobby(room); return; }
        current.slotId = msg.slotId;
        current.name = safePlayerName(msg.name);
        current.pose = null;
        json(ws, { type: "claim-ok", slotId: current.slotId });
        broadcastLobby(room);
      } else if (msg.type === "release") {
        current.slotId = null;
        current.pose = null;
        broadcastLobby(room);
      } else if (msg.type === "pose" && current.slotId && msg.pose) {
        const p = msg.pose;
        if ([p.x, p.y, p.z, p.yaw, p.pitch, p.speed].every(Number.isFinite)) {
          current.pose = {
            x: Number(p.x), y: Number(p.y), z: Number(p.z),
            yaw: Number(p.yaw), pitch: Number(p.pitch),
            speed: Math.max(0, Math.min(100, Number(p.speed))),
            flying: Boolean(p.flying),
            state: String(p.state || "").slice(0, 40),
            mapId: safeMapId(p.mapId || room.mapId),
            skin: p.skin === "platinum" ? "platinum" : "classic",
          };
          const packet = JSON.stringify({ type: "peer-pose", peer: { clientId: current.id, slotId: current.slotId, name: current.name, pose: current.pose } });
          for (const other of clientsInRoom(room)) if (other !== current && other.ws.readyState === WebSocket.OPEN) other.ws.send(packet);
        }
      } else if (msg.type === "game-event" && current.slotId === "human-1" && msg.event?.type === "human-attack") {
        const x = Number(msg.event.x), y = Number(msg.event.y), z = Number(msg.event.z);
        if (![x, y, z].every(Number.isFinite)) return;
        const event = {
          type: "human-attack",
          sourceClientId: current.id,
          x, y, z,
          radius: Math.max(0.1, Math.min(8, Number(msg.event.radius) || 1)),
          damage: Math.max(0, Math.min(100, Number(msg.event.damage) || 0)),
        };
        const packet = JSON.stringify({ type: "game-event", event });
        for (const other of clientsInRoom(room)) if (other !== current && other.ws.readyState === WebSocket.OPEN) other.ws.send(packet);
      }
    });

    ws.on("close", () => {
      const current = clients.get(ws);
      if (current) leaveRoom(current, false);
      clients.delete(ws);
    });
    ws.on("error", () => {
      // `close` handles cleanup; keeping an error listener prevents uncaught socket errors.
    });
  });

  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [ws, client] of clients) {
      if (!client.alive) {
        ws.terminate();
        continue;
      }
      client.alive = false;
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }
    for (const [id, room] of rooms) {
      if (clientsInRoom(room).length === 0 && now - room.lastActivityAt > roomIdleMs) rooms.delete(id);
    }
  }, 30_000);
  heartbeat.unref();

  httpServer.on("upgrade", (request, socket, head) => {
    let pathname = "/";
    try { pathname = new URL(request.url || "/", "http://localhost").pathname; } catch { /* ignore */ }
    if (pathname !== "/ws") { socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
  });

  return {
    wss,
    rooms,
    clients,
    close() {
      clearInterval(heartbeat);
      for (const client of clients.values()) client.ws.close(1001, "Server shutdown");
      wss.close();
    },
  };
}
