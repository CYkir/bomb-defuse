import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import { getSocket, type RoomState, getServerUrl } from "@/lib/socket";
import { Bomb } from "@/components/Bomb";
import { sounds } from "@/lib/sound";
import { Heart, Play, Users } from "lucide-react";

export const Route = createFileRoute("/tv/$code")({
  component: TV,
});

function TV() {
  const { code } = Route.useParams();
  const [state, setState] = useState<RoomState | null>(null);
  const [qr, setQr] = useState<string>("");
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [exploded, setExploded] = useState(false);
  const lastPhase = useRef<string>("");

  useEffect(() => {
    const s = getSocket();
    const join = () =>
      s.emit("tv:join", { code }, (res: { ok: boolean }) => {
        if (!res?.ok) console.warn("TV join failed");
      });
    join();
    s.on("connect", join);

    s.on("room:state", (rs: RoomState) => setState(rs));
    s.on("game:cutResult", ({ correct }: { correct: boolean }) => {
      setFlash(correct ? "good" : "bad");
      if (correct) sounds.correct();
      else sounds.wrong();
      setTimeout(() => setFlash(null), 700);
    });
    s.on("game:countdown", ({ n }: { n: number | "GO" }) => {
      if (n === "GO") sounds.go();
      else sounds.countdown();
    });
    s.on("game:tick", ({ timeLeft }: { timeLeft: number }) => {
      if (timeLeft <= 10 && timeLeft > 0) sounds.alarm();
    });

    return () => {
      s.off("room:state");
      s.off("game:cutResult");
      s.off("game:countdown");
      s.off("game:tick");
      s.off("connect", join);
    };
  }, [code]);

  // Generate QR to /join?code=XXXX (players can also just type)
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/join?code=${code}`;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      color: { dark: "#5aa9ff", light: "#0a0b16" },
    }).then(setQr);
  }, [code]);

  useEffect(() => {
    if (!state) return;
    if (lastPhase.current !== state.phase) {
      lastPhase.current = state.phase;
      if (state.phase === "won") {
        sounds.victory();
        fireConfetti();
      }
      if (state.phase === "lost") {
        sounds.explode();
        setExploded(true);
        setTimeout(() => setExploded(false), 3000);
      }
    }
  }, [state]);

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Connecting to server ({getServerUrl()})…
      </div>
    );
  }

  const start = () => getSocket().emit("admin:start", { code });
  const reset = () => getSocket().emit("admin:reset", { code });

  const dangerLow = state.phase === "playing" && state.timeLeft <= 10;

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${
        flash === "bad" ? "animate-flash-red" : ""
      } ${flash === "good" ? "animate-flash-green" : ""} ${
        dangerLow ? "animate-flash-red" : ""
      }`}
    >
      <div className="absolute inset-0 grid-bg opacity-30" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-border/50 px-8 py-4 backdrop-blur-md">
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Bomb Defuse — Room
          </div>
          <div className="font-display text-4xl font-black neon-text">
            {state.code}
          </div>
        </div>

        {state.phase === "playing" && (
          <div className="flex items-center gap-10">
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Score
              </div>
              <div className="font-display text-4xl font-black glow-text">
                {state.score}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Lives
              </div>
              <div className="mt-1 flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`h-7 w-7 ${
                      i < state.lives
                        ? "fill-destructive text-destructive"
                        : "text-muted-foreground opacity-30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Time
              </div>
              <div
                className={`font-display text-5xl font-black ${
                  dangerLow ? "danger-text animate-tick" : "neon-text"
                }`}
              >
                {String(state.timeLeft).padStart(2, "0")}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-8 px-8 py-10 lg:grid-cols-[1fr_auto_1fr]">
        {/* Left column: players */}
        <PlayersPanel state={state} />

        {/* Center */}
        <div className="flex flex-col items-center justify-center">
          {state.phase === "lobby" && (
            <LobbyCenter code={code} qr={qr} state={state} onStart={start} />
          )}

          {state.phase === "countdown" && (
            <div className="text-center">
              <div className="font-display text-[14rem] font-black leading-none neon-text animate-tick">
                {state.countdown === "GO" ? "GO!" : state.countdown ?? 3}
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.5em] text-muted-foreground">
                Team defusal — starting
              </div>
            </div>
          )}

          {(state.phase === "playing" ||
            state.phase === "won" ||
            state.phase === "lost") && (
            <div className="flex flex-col items-center">
              {exploded ? (
                <div className="animate-explode">
                  <Bomb
                    wires={state.wires}
                    selected={null}
                    danger
                    size={480}
                  />
                </div>
              ) : (
                <Bomb
                  wires={state.wires}
                  selected={state.lastCut?.color ?? null}
                  danger={dangerLow || flash === "bad"}
                  size={480}
                />
              )}

              {state.phase === "playing" && dangerLow && (
                <div className="mt-6 font-display text-2xl font-black danger-text animate-tick">
                  ⚠ FINAL COUNTDOWN
                </div>
              )}

              {state.phase === "won" && (
                <div className="mt-8 text-center">
                  <div className="font-display text-6xl font-black text-success">
                    ✅ MISSION COMPLETE
                  </div>
                  <div className="mt-2 text-lg text-muted-foreground">
                    Final score: <span className="text-glow">{state.score}</span>
                  </div>
                </div>
              )}

              {state.phase === "lost" && !exploded && (
                <div className="mt-8 text-center">
                  <div className="font-display text-6xl font-black danger-text">
                    💥 BOOM
                  </div>
                  <div className="mt-2 text-lg text-muted-foreground">
                    Mission Failed
                  </div>
                </div>
              )}

              {(state.phase === "won" || state.phase === "lost") && (
                <button
                  onClick={reset}
                  className="btn-neon hover:btn-neon-hover mt-8"
                >
                  New Round
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column: last event / status */}
        <StatusPanel state={state} flash={flash} />
      </div>
    </div>
  );
}

function LobbyCenter({
  code,
  qr,
  state,
  onStart,
}: {
  code: string;
  qr: string;
  state: RoomState;
  onStart: () => void;
}) {
  const readyCount = state.players.filter((p) => p.ready).length;
  const canStart = state.players.length >= 2 && readyCount === state.players.length;
  return (
    <div className="glass-strong flex flex-col items-center rounded-3xl p-10 text-center">
      <div className="text-xs uppercase tracking-[0.5em] text-muted-foreground">
        Scan to join
      </div>
      <div className="mt-4 rounded-2xl border border-neon/40 bg-black/40 p-4">
        {qr ? (
          <img src={qr} alt="Join QR" width={280} height={280} />
        ) : (
          <div className="h-[280px] w-[280px] animate-pulse rounded bg-white/5" />
        )}
      </div>
      <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
        or enter code
      </div>
      <div className="font-display text-6xl font-black neon-text">{code}</div>

      <div className="mt-6 text-lg text-muted-foreground">
        {state.players.length}/4 agents · {readyCount} ready
      </div>

      <button
        onClick={onStart}
        disabled={!canStart}
        className="btn-neon hover:btn-neon-hover mt-6 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Play className="h-5 w-5" /> Start Mission
      </button>
      {!canStart && (
        <div className="mt-2 text-xs text-muted-foreground">
          Need 2–4 players, all ready
        </div>
      )}
    </div>
  );
}

function PlayersPanel({ state }: { state: RoomState }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Users className="h-4 w-4" /> Squad
      </div>
      <ul className="space-y-2">
        {state.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-white/5 px-3 py-2"
          >
            <span className="font-semibold">
              {p.nickname}
              {p.isAdmin && (
                <span className="ml-2 text-[10px] uppercase tracking-widest text-glow">
                  host
                </span>
              )}
            </span>
            <span
              className={`text-xs uppercase tracking-widest ${
                p.ready ? "text-success" : "text-muted-foreground"
              }`}
            >
              {state.phase === "lobby"
                ? p.ready
                  ? "Ready"
                  : "Waiting"
                : p.connected
                  ? "Live"
                  : "Off"}
            </span>
          </li>
        ))}
        {state.players.length === 0 && (
          <li className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
            Waiting for agents…
          </li>
        )}
      </ul>
    </div>
  );
}

function StatusPanel({
  state,
  flash,
}: {
  state: RoomState;
  flash: "good" | "bad" | null;
}) {
  const cutCount = state.wires.filter((w) => w.cut).length;
  return (
    <div className="glass flex flex-col justify-between rounded-2xl p-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Status
        </div>
        <div className="mt-3">
          {flash === "good" && (
            <div className="font-display text-3xl font-black text-success animate-slide-in-up">
              ✅ CORRECT
            </div>
          )}
          {flash === "bad" && (
            <div className="font-display text-3xl font-black danger-text animate-slide-in-up">
              ❌ WRONG WIRE
            </div>
          )}
          {!flash && state.phase === "playing" && (
            <div className="text-lg font-semibold">
              {cutCount}/5 wires cut
            </div>
          )}
          {!flash && state.phase === "lobby" && (
            <div className="text-lg font-semibold">Awaiting squad…</div>
          )}
        </div>

        {state.phase === "playing" && (
          <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
            Last cut:{" "}
            <span
              className={
                state.lastCut?.correct === false ? "text-danger" : "text-success"
              }
            >
              {state.lastCut ? state.lastCut.color.toUpperCase() : "—"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        Team of {state.players.length}. Talk to each other. Combine clues. Cut
        wires in the correct order.
      </div>
    </div>
  );
}

function fireConfetti() {
  const end = Date.now() + 2000;
  const colors = ["#5aa9ff", "#a855f7", "#4ade80", "#ffde59"];
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
