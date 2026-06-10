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
      <header className="shrink-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <span className="text-sm font-bold text-white">X</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-slate-100">
                Okta Cross App Access · Flow Inspector
              </h1>
              <p className="text-[11px] text-slate-500">
                ID-JAG token exchange · live wire trace
              </p>
            </div>
          </div>
          {me?.user && (
            <button
              onClick={logout}
              className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
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
