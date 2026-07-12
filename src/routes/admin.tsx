import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getSocket } from "@/lib/socket";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = () => {
    setError("");
    setLoading(true);
    const s = getSocket();
    s.emit(
      "admin:create",
      {},
      (res: { ok: boolean; error?: string; code?: string; adminId?: string }) => {
        setLoading(false);
        if (!res?.ok || !res.code) {
          setError(res?.error || "Could not create room");
          return;
        }
        if (res.adminId) {
          localStorage.setItem(`bd:admin:${res.code}`, res.adminId);
        }
        navigate({ to: "/tv/$code", params: { code: res.code } });
      },
    );
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="glass rounded-2xl p-8 text-center">
        <h1 className="font-display text-3xl font-black glow-text">
          ADMIN CONSOLE
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a room. The TV screen will show the QR code for players.
        </p>
        <button
          disabled={loading}
          onClick={create}
          className="btn-neon hover:btn-neon-hover mt-8 w-full"
        >
          {loading ? "Creating…" : "Create Room"}
        </button>
        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
