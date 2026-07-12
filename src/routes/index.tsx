import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getServerUrl, setServerUrl } from "@/lib/socket";
import { Bomb, Users, Trophy, Settings2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(getServerUrl());
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-muted-foreground">
          <span className="h-px w-10 bg-neon/60" />
          Team Defusal Protocol
          <span className="h-px w-10 bg-glow/60" />
        </div>

        <h1 className="font-display text-6xl font-black leading-none sm:text-8xl md:text-9xl">
          <span className="neon-text">BOMB</span>{" "}
          <span className="glow-text">DEFUSE</span>
        </h1>

        <p className="mt-6 max-w-xl text-center text-lg text-muted-foreground">
          60 seconds. 5 wires. 4 phones. One team.
          <br />
          <span className="text-foreground/80">
            Share your clues out loud. Cut the right wire. Don't blow up.
          </span>
        </p>

        <div className="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <Link
            to="/join"
            className="glass hover:btn-neon-hover group flex flex-col items-center justify-center rounded-2xl p-8 text-center transition-all"
          >
            <Users className="mb-3 h-10 w-10 text-neon transition-transform group-hover:scale-110" />
            <div className="font-display text-xl font-bold uppercase tracking-widest">
              Join Game
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Enter a room code
            </div>
          </Link>

          <Link
            to="/admin"
            className="glass hover:btn-neon-hover group flex flex-col items-center justify-center rounded-2xl p-8 text-center transition-all"
          >
            <Bomb className="mb-3 h-10 w-10 text-glow transition-transform group-hover:scale-110" />
            <div className="font-display text-xl font-bold uppercase tracking-widest">
              Admin
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Create a room & host TV
            </div>
          </Link>

          <Link
            to="/leaderboard"
            className="glass hover:btn-neon-hover group flex flex-col items-center justify-center rounded-2xl p-8 text-center transition-all"
          >
            <Trophy className="mb-3 h-10 w-10 text-wire-yellow transition-transform group-hover:scale-110" />
            <div className="font-display text-xl font-bold uppercase tracking-widest">
              Leaderboard
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Top agents</div>
          </Link>
        </div>

        <button
          onClick={() => setShowSettings((s) => !s)}
          className="mt-12 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-neon"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Server: {url || "…"}
        </button>

        {showSettings && (
          <div className="glass mt-4 w-full max-w-md rounded-xl p-4 animate-slide-in-up">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Socket.IO server URL
            </label>
            <div className="mt-2 flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://192.168.1.10:3001"
                className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-neon"
              />
              <button
                onClick={() => {
                  setServerUrl(url);
                  setShowSettings(false);
                }}
                className="btn-neon hover:btn-neon-hover !py-2 !px-4 text-xs"
              >
                Save
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Point every phone and the TV to the laptop hosting{" "}
              <code className="text-neon">server/</code> on port 3001.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
