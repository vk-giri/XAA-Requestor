import type { HttpCall, Token } from "../types";

export interface StepInfo {
  n: number;
  title: string;
  subtitle?: string;
  call?: HttpCall;
  token?: Token;
  tokenLabel?: string;
}

const KEY_CLAIMS = ["sub", "iss", "aud", "scp", "scope", "cid", "uid", "name", "email", "act"];

export function StepCard({ step, onClick }: { step: StepInfo; onClick?: () => void }) {
  const empty = !step.call && !step.token;
  const interactive = !empty;
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold">
            {step.n}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">{step.title}</div>
            {step.subtitle && (
              <div className="truncate text-[11px] text-slate-500">{step.subtitle}</div>
            )}
          </div>
        </div>
        {step.call && <StatusPill status={step.call.status} ms={step.call.durationMs} />}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
        {empty ? (
          <p className="text-slate-400">Run XAA flow to populate.</p>
        ) : (
          <>
            {step.call && <CallSummary call={step.call} />}
            {step.token && <TokenSummary token={step.token} />}
          </>
        )}
      </div>

      {interactive && (
        <button
          onClick={onClick}
          className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-indigo-700 hover:bg-slate-100"
        >
          View full details →
        </button>
      )}
    </div>
  );
}

function StatusPill({ status, ms }: { status: number; ms: number }) {
  const color =
    status === 0
      ? "bg-slate-200 text-slate-700"
      : status >= 500
        ? "bg-red-100 text-red-700"
        : status >= 400
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700";
  return (
    <div className="flex shrink-0 items-center gap-1 text-[11px]">
      <span className={`rounded px-1.5 py-0.5 font-medium ${color}`}>
        {status === 0 ? "ERR" : status}
      </span>
      <span className="text-slate-500">{ms}ms</span>
    </div>
  );
}

function CallSummary({ call }: { call: HttpCall }) {
  return (
    <div className="mb-3 space-y-0.5 break-all font-mono text-[11px] text-slate-600">
      <div>
        <span className="font-semibold text-slate-700">{call.method}</span> {call.url}
      </div>
    </div>
  );
}

function TokenSummary({ token }: { token: Token }) {
  if (!token.payload) {
    return <p className="text-slate-400">(no token)</p>;
  }
  const payload = token.payload as Record<string, unknown>;
  const claims = KEY_CLAIMS.filter((k) => k in payload).map(
    (k) => [k, payload[k]] as [string, unknown],
  );
  const exp = typeof payload.exp === "number" ? (payload.exp as number) : null;
  const remaining = exp ? Math.round(exp - Date.now() / 1000) : null;

  return (
    <dl className="space-y-1 font-mono text-[11px]">
      {claims.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[55px_1fr] gap-x-2">
          <dt className="truncate text-slate-500">{k}</dt>
          <dd className="break-all text-slate-800">{formatClaim(v)}</dd>
        </div>
      ))}
      {remaining !== null && (
        <div className="grid grid-cols-[55px_1fr] gap-x-2">
          <dt className="truncate text-slate-500">exp</dt>
          <dd className={remaining > 0 ? "text-slate-800" : "text-red-600"}>
            {remaining > 0 ? `${remaining}s remaining` : `expired ${-remaining}s ago`}
          </dd>
        </div>
      )}
    </dl>
  );
}

function formatClaim(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
