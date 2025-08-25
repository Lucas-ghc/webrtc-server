// server.js
// npm init -y && npm i ws
// node server.js
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

/** rooms: Map<roomId, Set<ws>> */
const rooms = new Map();

function joinRoom(room, socket) {
  console.log('join room');
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(socket);
  socket.roomId = room;
}

function leaveRoom(socket) {
  console.log('leave room');
  const room = socket.roomId;
  if (!room) return;
  const set = rooms.get(room);
  if (set) {
    set.delete(socket);
    // informer l'autre pair
    for (const client of set) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ room, type: "peer-left" }));
      }
    }
    if (set.size === 0) rooms.delete(room);
  }
  socket.roomId = null;
}

wss.on("connection", (ws) => {
  console.log('connection...');
  ws.on("message", (raw) => {
    console.log('msg received : ', JSON.parse(raw));
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const { room, type } = msg;
    if (!room) return;

    if (type === "join") {
      joinRoom(room, ws);
      return;
    }

    if (!rooms.has(room)) return;

    // broadcast to others in the same room
    for (const client of rooms.get(room)) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    }

    if (type === "leave") {
      leaveRoom(ws);
    }
  });

  ws.on("close", () => leaveRoom(ws));
});
