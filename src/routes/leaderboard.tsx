import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { Trophy, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
});

interface Row {
  nickname: string;
  games: number;
  wins: number;
  lastPlayed: string;
}

function Leaderboard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = getSocket();
    s.emit("leaderboard:get", {}, (res: { ok: boolean; rows?: Row[]; error?: string }) => {
      if (!res?.ok) {
        setError(res?.error || "Could not load leaderboard");
        setRows([]);
        return;
      }
      setRows(res.rows || []);
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-neon"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>
      <div className="glass rounded-2xl p-6 sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-wire-yellow" />
          <h1 className="font-display text-3xl font-black glow-text">
            LEADERBOARD
          </h1>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {error}
            <div className="mt-1 text-xs text-muted-foreground">
              Make sure the server is running.
            </div>
          </div>
        )}

        {rows && rows.length === 0 && !error && (
          <div className="py-10 text-center text-muted-foreground">
            No games played yet. Be the first legend.
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Player</th>
                  <th className="p-3 text-right">Wins</th>
                  <th className="p-3 text-right">Games</th>
                  <th className="p-3 text-right">Last</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.nickname + i}
                    className="border-t border-border/60 hover:bg-white/5"
                  >
                    <td className="p-3 font-display text-neon">
                      {i + 1}
                    </td>
                    <td className="p-3 font-semibold">{r.nickname}</td>
                    <td className="p-3 text-right text-success">{r.wins}</td>
                    <td className="p-3 text-right">{r.games}</td>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      {new Date(r.lastPlayed).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
