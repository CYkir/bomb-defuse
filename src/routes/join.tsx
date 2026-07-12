import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { z } from "zod";

export const Route = createFileRoute("/join")({
  validateSearch: z.object({ code: z.string().optional() }),
  component: Join,
});

function Join() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  useEffect(() => {
    if (search.code) setCode(search.code.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.code]);
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = () => {
    setError("");
    const c = code.trim().toUpperCase();
    const n = nickname.trim().slice(0, 16);
    if (c.length < 4 || !n) {
      setError("Room code and nickname required");
      return;
    }
    setLoading(true);
    const s = getSocket();
    s.emit(
      "player:join",
      { code: c, nickname: n },
      (res: { ok: boolean; error?: string; playerId?: string }) => {
        setLoading(false);
        if (!res?.ok) {
          setError(res?.error || "Could not join");
          return;
        }
        if (res.playerId) {
          localStorage.setItem(`bd:pid:${c}`, res.playerId);
          localStorage.setItem(`bd:nick:${c}`, n);
        }
        navigate({ to: "/room/$code", params: { code: c } });
      },
    );
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="glass rounded-2xl p-8">
        <h1 className="font-display text-3xl font-black neon-text">
          JOIN A ROOM
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the TV's QR code — or type it below.
        </p>

        <label className="mt-6 block text-xs uppercase tracking-widest text-muted-foreground">
          Room Code
        </label>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX"
          maxLength={6}
          className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-3 text-center font-display text-3xl tracking-[0.4em] outline-none focus:border-neon"
        />

        <label className="mt-6 block text-xs uppercase tracking-widest text-muted-foreground">
          Nickname
        </label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Agent 47"
          maxLength={16}
          className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-3 text-lg outline-none focus:border-neon"
        />

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <button
          disabled={loading}
          onClick={submit}
          className="btn-neon hover:btn-neon-hover mt-6 w-full disabled:opacity-50"
        >
          {loading ? "Connecting…" : "Join"}
        </button>
      </div>
    </div>
  );
}
