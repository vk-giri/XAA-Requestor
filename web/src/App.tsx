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
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-base font-semibold leading-tight">Okta XAA flow inspector</h1>
            <p className="text-xs text-slate-500">
              Cross App Access · ID-JAG token exchange · live wire trace
            </p>
          </div>
          {me?.user && (
            <button
              onClick={logout}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
            >
              Log out
            </button>
          )}
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : me?.user ? (
          <XaaFlow user={me.user} idToken={me.idToken ?? null} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <LoginGate />
          </div>
        )}
      </main>
    </div>
  );
}
