import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import { WIRES, randomOrder, assignClues } from "./clues.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// --- SQLite ---
const db = new Database(path.join(__dirname, "bomb-defuse.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    won INTEGER NOT NULL,
    score INTEGER NOT NULL,
    played_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_games_nickname ON games(nickname);
`);
const insertGame = db.prepare(
  "INSERT INTO games (nickname, won, score, played_at) VALUES (?, ?, ?, ?)",
);
const leaderboardStmt = db.prepare(`
  SELECT nickname,
         COUNT(*)      AS games,
         SUM(won)      AS wins,
         MAX(played_at) AS lastPlayed
  FROM games
  GROUP BY nickname
  ORDER BY wins DESC, games DESC, lastPlayed DESC
  LIMIT 50
`);

// --- Express + Socket.IO ---
const app = express();
app.use(cors({ origin: "*" }));
app.get("/", (_req, res) => res.send("Bomb Defuse server running."));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// --- Rooms ---
/** @type {Map<string, Room>} */
const rooms = new Map();

const GAME_DURATION = 60;
const MAX_PLAYERS = 4;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c;
  do {
    c = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  } while (rooms.has(c));
  return c;
}

function publicPlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    ready: p.ready,
    isAdmin: p.id === room.adminId,
    connected: p.connected,
  }));
}

function publicState(room) {
  return {
    code: room.code,
    phase: room.phase,
    players: publicPlayers(room),
    lives: room.lives,
    score: room.score,
    timeLeft: room.timeLeft,
    wires: room.wires,
    lastCut: room.lastCut,
    countdown: room.countdown,
  };
}

function emitState(room) {
  io.to(room.code).emit("room:state", publicState(room));
}

function createRoom(adminSocketId) {
  const code = makeCode();
  const room = {
    code,
    adminId: null, // set when admin joins as player OR left null (admin is TV only)
    adminSocket: adminSocketId,
    players: [], // {id, nickname, ready, connected, socketId}
    phase: "lobby",
    lives: 3,
    score: 0,
    timeLeft: GAME_DURATION,
    wires: WIRES.map((color) => ({ color, cut: false })),
    order: [], // correct order
    stepIndex: 0,
    lastCut: null,
    countdown: null,
    tickTimer: null,
    countdownTimer: null,
  };
  rooms.set(code, room);
  return room;
}

function resetRoom(room) {
  clearTimers(room);
  room.phase = "lobby";
  room.lives = 3;
  room.score = 0;
  room.timeLeft = GAME_DURATION;
  room.wires = WIRES.map((color) => ({ color, cut: false }));
  room.order = [];
  room.stepIndex = 0;
  room.lastCut = null;
  room.countdown = null;
  room.players.forEach((p) => (p.ready = false));
}

function clearTimers(room) {
  if (room.tickTimer) {
    clearInterval(room.tickTimer);
    room.tickTimer = null;
  }
  if (room.countdownTimer) {
    clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
  }
}

function startCountdown(room) {
  room.phase = "countdown";
  const seq = [3, 2, 1, "GO"];
  let i = 0;
  const step = () => {
    room.countdown = seq[i];
    io.to(room.code).emit("game:countdown", { n: seq[i] });
    emitState(room);
    i++;
    if (i < seq.length) {
      room.countdownTimer = setTimeout(step, 1000);
    } else {
      room.countdownTimer = setTimeout(() => startPlaying(room), 800);
    }
  };
  step();
}

function startPlaying(room) {
  room.phase = "playing";
  room.countdown = null;
  room.timeLeft = GAME_DURATION;
  room.lives = 3;
  room.score = 0;
  room.wires = WIRES.map((color) => ({ color, cut: false }));
  room.order = randomOrder();
  room.stepIndex = 0;
  room.lastCut = null;

  // send private clues to each player
  const clues = assignClues(
    room.players.map((p) => p.id),
    room.order,
  );
  room.players.forEach((p) => {
    io.to(p.socketId).emit("room:clue", { clue: clues[p.id] });
  });

  emitState(room);

  room.tickTimer = setInterval(() => {
    room.timeLeft -= 1;
    io.to(room.code).emit("game:tick", { timeLeft: room.timeLeft });
    if (room.timeLeft <= 0) {
      endGame(room, false);
    } else {
      emitState(room);
    }
  }, 1000);
}

function endGame(room, win) {
  clearTimers(room);
  room.phase = win ? "won" : "lost";
  // persist to leaderboard
  const now = new Date().toISOString();
  for (const p of room.players) {
    try {
      insertGame.run(p.nickname, win ? 1 : 0, room.score, now);
    } catch (e) {
      console.error("db insert error", e);
    }
  }
  emitState(room);
}

function handleCut(room, wire, byPlayerId) {
  if (room.phase !== "playing") return;
  const w = room.wires.find((x) => x.color === wire);
  if (!w || w.cut) return;

  const expected = room.order[room.stepIndex];
  const correct = wire === expected;

  if (correct) {
    w.cut = true;
    w.correct = true;
    room.stepIndex += 1;
    room.score += 100;
    room.lastCut = { color: wire, correct: true, by: byPlayerId };
    io.to(room.code).emit("game:cutResult", { wire, correct: true });
    if (room.stepIndex >= room.order.length) {
      endGame(room, true);
      return;
    }
  } else {
    room.lives -= 1;
    room.lastCut = { color: wire, correct: false, by: byPlayerId };
    io.to(room.code).emit("game:cutResult", { wire, correct: false });
    if (room.lives <= 0) {
      endGame(room, false);
      return;
    }
  }
  emitState(room);
}

// --- Socket handlers ---
io.on("connection", (socket) => {
  socket.on("admin:create", (_data, cb) => {
    const room = createRoom(socket.id);
    socket.join(room.code);
    cb?.({ ok: true, code: room.code, adminId: socket.id });
    emitState(room);
  });

  socket.on("tv:join", ({ code }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    socket.join(code);
    room.adminSocket = socket.id;
    cb?.({ ok: true });
    emitState(room);
  });

  socket.on("player:join", ({ code, nickname }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    if (room.phase !== "lobby")
      return cb?.({ ok: false, error: "Game already in progress" });
    if (room.players.length >= MAX_PLAYERS)
      return cb?.({ ok: false, error: "Room is full" });
    const player = {
      id: socket.id,
      nickname: String(nickname).slice(0, 16) || "Agent",
      ready: false,
      connected: true,
      socketId: socket.id,
    };
    room.players.push(player);
    if (!room.adminId) room.adminId = player.id; // first player is host
    socket.join(code);
    socket.data.roomCode = code;
    cb?.({ ok: true, playerId: player.id });
    emitState(room);
  });

  socket.on("player:rejoin", ({ code, playerId, nickname }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    let p = room.players.find((x) => x.id === playerId);
    if (!p && room.phase === "lobby" && room.players.length < MAX_PLAYERS && nickname) {
      // Late reconnect during lobby with fresh nickname
      p = {
        id: socket.id,
        nickname: String(nickname).slice(0, 16) || "Agent",
        ready: false,
        connected: true,
        socketId: socket.id,
      };
      room.players.push(p);
      if (!room.adminId) room.adminId = p.id;
    }
    if (!p) return cb?.({ ok: false, error: "Player not in room" });
    p.socketId = socket.id;
    p.connected = true;
    socket.join(code);
    socket.data.roomCode = code;
    cb?.({ ok: true, playerId: p.id });
    emitState(room);
  });

  socket.on("player:ready", ({ code, ready }) => {
    const room = rooms.get(code);
    if (!room) return;
    const p = room.players.find((x) => x.socketId === socket.id);
    if (!p) return;
    p.ready = !!ready;
    emitState(room);
  });

  socket.on("admin:start", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.phase !== "lobby") return;
    if (room.players.length < 2 || room.players.length > MAX_PLAYERS) return;
    if (!room.players.every((p) => p.ready)) return;
    startCountdown(room);
  });

  socket.on("admin:reset", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    resetRoom(room);
    emitState(room);
  });

  socket.on("game:cut", ({ code, wire }) => {
    const room = rooms.get(code);
    if (!room) return;
    const p = room.players.find((x) => x.socketId === socket.id);
    if (!p) return;
    handleCut(room, wire, p.id);
  });

  socket.on("room:leave", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    room.players = room.players.filter((x) => x.socketId !== socket.id);
    socket.leave(code);
    if (room.players.length === 0 && !room.adminSocket) {
      clearTimers(room);
      rooms.delete(code);
    } else {
      emitState(room);
    }
  });

  socket.on("leaderboard:get", (_d, cb) => {
    try {
      const rows = leaderboardStmt.all().map((r) => ({
        nickname: r.nickname,
        games: r.games,
        wins: r.wins,
        lastPlayed: r.lastPlayed,
      }));
      cb?.({ ok: true, rows });
    } catch (e) {
      cb?.({ ok: false, error: String(e) });
    }
  });

  socket.on("disconnect", () => {
    // mark player disconnected but keep them in room so they can rejoin
    for (const room of rooms.values()) {
      const p = room.players.find((x) => x.socketId === socket.id);
      if (p) {
        p.connected = false;
        emitState(room);
      }
      if (room.adminSocket === socket.id) {
        room.adminSocket = null;
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n💣  Bomb Defuse server listening on http://0.0.0.0:${PORT}`);
  console.log(`   Point the web app's "Server URL" setting at this address.`);
  console.log(`   From another device on the same WiFi, use your laptop's LAN IP.`);
});
