import { useState } from "react";
import type { Token } from "../types";
import { redactToken, formatTimestamp } from "../jwt";

export function TokenCard({ label, token }: { label: string; token: Token }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        {token.raw && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100"
          >
            {revealed ? "Hide raw" : "Reveal raw"}
          </button>
        )}
      </div>
      <div className="space-y-3 p-4 text-xs">
        <Block title="Raw">
          <pre className="overflow-auto break-all whitespace-pre-wrap rounded bg-slate-50 p-3 font-mono">
            {revealed ? token.raw : redactToken(token.raw)}
          </pre>
        </Block>
        {token.header && (
          <Block title="Decoded header">
            <pre className="overflow-auto rounded bg-slate-50 p-3 font-mono">
              {JSON.stringify(token.header, null, 2)}
            </pre>
          </Block>
        )}
        {token.payload && (
          <Block title="Decoded payload">
            <pre className="overflow-auto rounded bg-slate-50 p-3 font-mono">
              {JSON.stringify(token.payload, null, 2)}
            </pre>
            <ClaimHints payload={token.payload} />
          </Block>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </div>
  );
}

function ClaimHints({ payload }: { payload: Record<string, unknown> }) {
  const hints: { k: string; v: string }[] = [];
  if (typeof payload.iat === "number") hints.push({ k: "iat", v: formatTimestamp(payload.iat) });
  if (typeof payload.exp === "number") {
    const remaining = Math.round(payload.exp - Date.now() / 1000);
    hints.push({
      k: "exp",
      v: `${formatTimestamp(payload.exp)}  (${remaining > 0 ? `in ${remaining}s` : `${-remaining}s ago`})`,
    });
  }
  if (typeof payload.auth_time === "number")
    hints.push({ k: "auth_time", v: formatTimestamp(payload.auth_time) });
  if (hints.length === 0) return null;
  return (
    <dl className="mt-2 space-y-0.5 font-mono text-[11px] text-slate-500">
      {hints.map((h) => (
        <div key={h.k} className="grid grid-cols-[80px_1fr] gap-x-2">
          <dt>{h.k}</dt>
          <dd>{h.v}</dd>
        </div>
      ))}
    </dl>
  );
}
