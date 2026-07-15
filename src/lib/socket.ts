import { io, type Socket } from "socket.io-client";

const STORAGE_KEY = "bomb-defuse:server-url";

export function getServerUrl(): string {
  if (typeof window === "undefined") return "";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;
  // Default: same hostname, port 3001 (the standalone Node/Express/Socket.IO server)
  const host = window.location.hostname || "localhost";
  // return `http://${host}:3001`;
  return `https://api-bomb.cykir.web.id`;

}

export function setServerUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/$/, ""));
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.connect();
    return socket;
  }
  socket = io(getServerUrl(), {
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// --- Shared game types ---

export type WireColor = "red" | "green" | "blue" | "yellow" | "black";

export const WIRE_COLORS: WireColor[] = [
  "red",
  "green",
  "blue",
  "yellow",
  "black",
];

export interface Player {
  id: string;
  nickname: string;
  ready: boolean;
  isAdmin: boolean;
  connected: boolean;
}

export type Phase =
  | "lobby"
  | "countdown"
  | "playing"
  | "won"
  | "lost"
  | "ended";

export interface RoomState {
  code: string;
  phase: Phase;
  players: Player[];
  lives: number;
  score: number;
  timeLeft: number;
  wires: { color: WireColor; cut: boolean; correct?: boolean }[];
  lastCut?: { color: WireColor; correct: boolean; by?: string };
  countdown?: number | "GO";
}
