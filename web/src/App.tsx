import { useEffect, useState } from "react";
import { LoginGate } from "./components/LoginGate";
import { XaaFlow } from "./components/XaaFlow";
import { api } from "./api";
import type { MeResponse } from "./types";

export default function App() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => setMe({ user: null }))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await api.logout();
    setMe({ user: null });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Okta XAA flow inspector</h1>
            <p className="text-xs text-slate-500">
              Cross App Access · ID-JAG token exchange · live wire trace
            </p>
          </div>
          {me?.user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-600">{me.user.email ?? me.user.sub}</span>
              <button
                className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
                onClick={logout}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : me?.user ? (
          <XaaFlow user={me.user} idToken={me.idToken ?? null} />
        ) : (
          <LoginGate />
        )}
      </main>
    </div>
  );
}
