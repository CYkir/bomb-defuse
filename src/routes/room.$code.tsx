import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSocket, type RoomState, type WireColor, WIRE_COLORS } from "@/lib/socket";
import { sounds } from "@/lib/sound";
import { Check, Heart, LogOut } from "lucide-react";

export const Route = createFileRoute("/room/$code")({
  component: Room,
});

const WIRE_CLASS: Record<WireColor, string> = {
  red: "bg-wire-red text-white",
  green: "bg-wire-green text-black",
  blue: "bg-wire-blue text-white",
  yellow: "bg-wire-yellow text-black",
  black: "bg-wire-black text-white",
};

function Room() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<RoomState | null>(null);
  const [clue, setClue] = useState<string>("");
  const [myId, setMyId] = useState<string>("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const lastPhaseRef = useRef<string>("");

  useEffect(() => {
    const s = getSocket();
    const savedId = localStorage.getItem(`bd:pid:${code}`) || "";
    const savedNick = localStorage.getItem(`bd:nick:${code}`) || "";

    const rejoin = () => {
      s.emit(
        "player:rejoin",
        { code, playerId: savedId, nickname: savedNick },
        (res: { ok: boolean; playerId?: string; error?: string }) => {
          if (!res?.ok) {
            setError(res?.error || "Room not found");
            return;
          }
          if (res.playerId) {
            setMyId(res.playerId);
            localStorage.setItem(`bd:pid:${code}`, res.playerId);
          }
        },
      );
    };
    rejoin();
    s.on("connect", rejoin);

    s.on("room:state", (rs: RoomState) => {
      setState(rs);
    });
    s.on("room:clue", ({ clue }: { clue: string }) => setClue(clue));
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

    return () => {
      s.off("room:state");
      s.off("room:clue");
      s.off("game:cutResult");
      s.off("game:countdown");
      s.off("connect", rejoin);
    };
  }, [code]);

  const me = useMemo(
    () => state?.players.find((p) => p.id === myId),
    [state, myId],
  );

  useEffect(() => {
    if (!state) return;
    if (lastPhaseRef.current !== state.phase) {
      lastPhaseRef.current = state.phase;
      if (state.phase === "won") sounds.victory();
      if (state.phase === "lost") sounds.explode();
    }
  }, [state]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="glass w-full rounded-2xl p-8 text-center">
          <div className="danger-text font-display text-2xl">CONNECTION LOST</div>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link to="/join" className="btn-neon hover:btn-neon-hover mt-6 inline-flex">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Connecting…
      </div>
    );
  }

  const toggleReady = () => {
    getSocket().emit("player:ready", { code, ready: !me?.ready });
  };

  const cut = (color: WireColor) => {
    if (state.phase !== "playing") return;
    if (state.wires.find((w) => w.color === color)?.cut) return;
    getSocket().emit("game:cut", { code, wire: color });
  };

  const leave = () => {
    getSocket().emit("room:leave", { code });
    localStorage.removeItem(`bd:pid:${code}`);
    navigate({ to: "/" });
  };

  return (
    <div
      className={`min-h-screen px-4 py-6 transition-colors ${
        flash === "bad" ? "animate-flash-red" : ""
      } ${flash === "good" ? "animate-flash-green" : ""}`}
    >
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Room
            </div>
            <div className="font-display text-2xl font-black neon-text">
              {state.code}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Agent
            </div>
            <div className="font-semibold">{me?.nickname || "…"}</div>
          </div>
        </div>

        {state.phase === "lobby" && (
          <LobbyView
            state={state}
            me={me}
            onReady={toggleReady}
            onLeave={leave}
          />
        )}

        {state.phase === "countdown" && (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Get Ready
            </div>
            <div className="mt-4 font-display text-8xl font-black neon-text animate-tick">
              {state.countdown === "GO" ? "GO!" : state.countdown ?? 3}
            </div>
          </div>
        )}

        {state.phase === "playing" && (
          <div className="space-y-4">
            <div className="glass flex items-center justify-between rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`h-5 w-5 ${
                      i < state.lives
                        ? "fill-destructive text-destructive"
                        : "text-muted-foreground opacity-30"
                    }`}
                  />
                ))}
              </div>
              <div
                className={`font-display text-2xl font-black ${
                  state.timeLeft <= 10 ? "danger-text animate-tick" : "neon-text"
                }`}
              >
                {String(state.timeLeft).padStart(2, "0")}
              </div>
              <div className="font-display text-lg text-glow">
                {state.score}
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Your Clue
              </div>
              <div className="mt-2 text-lg font-semibold leading-snug">
                {clue || "(no clue this round — help your team!)"}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                Cut a wire
              </div>
              <div className="grid grid-cols-1 gap-3">
                {WIRE_COLORS.map((c) => {
                  const wire = state.wires.find((w) => w.color === c);
                  const isCut = wire?.cut;
                  return (
                    <button
                      key={c}
                      disabled={isCut}
                      onClick={() => cut(c)}
                      className={`${WIRE_CLASS[c]} flex items-center justify-between rounded-xl px-5 py-5 font-display text-xl font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:line-through`}
                      style={{
                        boxShadow: isCut
                          ? undefined
                          : "0 6px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                      }}
                    >
                      <span>{c}</span>
                      {isCut ? <Check className="h-6 w-6" /> : <span>✂</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {(state.phase === "won" || state.phase === "lost") && (
          <div className="glass rounded-2xl p-8 text-center">
            {state.phase === "won" ? (
              <>
                <div className="font-display text-4xl font-black text-success">
                  MISSION COMPLETE
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  You saved the room. Score: {state.score}
                </p>
              </>
            ) : (
              <>
                <div className="font-display text-4xl font-black danger-text">
                  BOOM
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mission failed. Score: {state.score}
                </p>
              </>
            )}
            <button
              onClick={leave}
              className="btn-neon hover:btn-neon-hover mt-6"
            >
              Return home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LobbyView({
  state,
  me,
  onReady,
  onLeave,
}: {
  state: RoomState;
  me: { ready: boolean } | undefined;
  onReady: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Players ({state.players.length}/4)
        </div>
        <ul className="mt-3 space-y-2">
          {state.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-white/5 px-3 py-2"
            >
              <span className="font-semibold">
                {p.nickname}
                {p.isAdmin && (
                  <span className="ml-2 rounded bg-glow/20 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-glow">
                    host
                  </span>
                )}
              </span>
              <span
                className={`text-xs uppercase tracking-widest ${
                  p.ready ? "text-success" : "text-muted-foreground"
                }`}
              >
                {p.ready ? "Ready" : "Waiting"}
              </span>
            </li>
          ))}
          {state.players.length < 2 && (
            <li className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
              Waiting for teammates (min 2)…
            </li>
          )}
        </ul>
      </div>

      <button
        onClick={onReady}
        className={`w-full rounded-xl py-4 font-display text-xl font-bold uppercase tracking-widest transition-all ${
          me?.ready
            ? "bg-success/20 text-success ring-2 ring-success"
            : "btn-neon hover:btn-neon-hover"
        }`}
      >
        {me?.ready ? "✓ Ready" : "I'm ready"}
      </button>

      <button
        onClick={onLeave}
        className="mx-auto flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-danger"
      >
        <LogOut className="h-3.5 w-3.5" /> Leave room
      </button>
    </div>
  );
}
