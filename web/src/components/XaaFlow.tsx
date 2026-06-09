import { useState } from "react";
import { api } from "../api";
import type { HttpCall, Token, User, XaaResult } from "../types";
import { StepCard } from "./StepCard";
import type { StepInfo } from "./StepCard";
import { StepDetailModal } from "./StepDetailModal";

const blankToken = (): Token => ({ raw: "", header: null, payload: null });

export function XaaFlow({ user, idToken }: { user: User; idToken: Token | null }) {
  const [result, setResult] = useState<XaaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<StepInfo | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const { ok, data } = await api.runXaa();
      if (ok) {
        setResult(data as XaaResult);
      } else {
        const calls = (data as { httpCalls?: HttpCall[] }).httpCalls ?? [];
        setError(
          (data as { message?: string }).message ?? (data as { error?: string }).error ?? "Failed",
        );
        setResult({
          tokens: {
            idToken: idToken ?? blankToken(),
            idJag: blankToken(),
            accessToken: blankToken(),
          },
          httpCalls: calls,
          resource: null,
        });
      }
    } catch (e) {
      setError((e as Error).message ?? "Network error");
    } finally {
      setRunning(false);
    }
  }

  const step1Call = result?.httpCalls.find((c) => c.stage.startsWith("step1"));
  const step2Call = result?.httpCalls.find((c) => c.stage.startsWith("step2"));
  const step3Call = result?.httpCalls.find((c) => c.stage.startsWith("step3"));

  const idJagToken = result?.tokens.idJag.raw ? result.tokens.idJag : undefined;
  const accessToken = result?.tokens.accessToken.raw ? result.tokens.accessToken : undefined;

  const steps: StepInfo[] = [
    {
      n: 0,
      title: "OIDC login",
      subtitle: "id_token from authorization-code grant",
      token: idToken ?? undefined,
      tokenLabel: "id_token",
    },
    {
      n: 1,
      title: "Org AS → ID-JAG",
      subtitle: "token-exchange (private_key_jwt)",
      call: step1Call,
      token: idJagToken,
      tokenLabel: "ID-JAG",
    },
    {
      n: 2,
      title: "Custom AS → access_token",
      subtitle: "jwt-bearer redemption",
      call: step2Call,
      token: accessToken,
      tokenLabel: "access_token",
    },
    {
      n: 3,
      title: "Resource API",
      subtitle: "GET with Bearer",
      call: step3Call,
    },
  ];

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-xs text-indigo-700">
            {user.sub}
          </span>
          {user.email && <span className="truncate text-slate-600">{user.email}</span>}
          {user.name && <span className="truncate text-slate-500">· {user.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            onClick={run}
            disabled={running}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? "Running…" : "Run XAA flow"}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto bg-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-4 lg:overflow-hidden">
        {steps.map((s) => (
          <StepCard key={s.n} step={s} onClick={() => setSelected(s)} />
        ))}
      </div>

      {selected && <StepDetailModal step={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
