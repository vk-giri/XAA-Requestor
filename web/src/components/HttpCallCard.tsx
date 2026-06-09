import { useState } from "react";
import type { ReactNode } from "react";
import type { HttpCall } from "../types";

export function HttpCallCard({ call }: { call: HttpCall }) {
  const [open, setOpen] = useState(true);
  const statusColor =
    call.status === 0
      ? "bg-slate-200 text-slate-700"
      : call.status >= 500
        ? "bg-red-100 text-red-700"
        : call.status >= 400
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700";

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs">{call.method}</span>
        <span className="flex-1 truncate font-mono text-xs text-slate-700">{call.url}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor}`}>
          {call.status === 0 ? "ERR" : call.status}
        </span>
        <span className="text-xs text-slate-500">{call.durationMs}ms</span>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-200 p-4 text-xs">
          <Section title="Request headers">
            <KvTable kv={call.requestHeaders} />
          </Section>
          {call.requestBody && (
            <Section title="Request body">
              <BodyView raw={call.requestBody} />
            </Section>
          )}
          <Section title="Response headers">
            <KvTable kv={call.responseHeaders} />
          </Section>
          <Section title="Response body">
            <pre className="overflow-auto rounded bg-slate-50 p-3 font-mono whitespace-pre-wrap break-all">
              {typeof call.responseBody === "string"
                ? call.responseBody
                : JSON.stringify(call.responseBody, null, 2)}
            </pre>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </div>
  );
}

function KvTable({ kv }: { kv: Record<string, string> }) {
  const entries = Object.entries(kv);
  if (entries.length === 0) return <p className="text-slate-400">(none)</p>;
  return (
    <div className="space-y-1 font-mono">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[200px_1fr] gap-x-3">
          <span className="truncate text-slate-500">{k}</span>
          <span className="break-all text-slate-800">{v}</span>
        </div>
      ))}
    </div>
  );
}

function BodyView({ raw }: { raw: string }) {
  // Try form-urlencoded first
  if (raw.includes("=") && !raw.trim().startsWith("{")) {
    try {
      const params = new URLSearchParams(raw);
      const entries = Array.from(params.entries());
      if (entries.length > 0) {
        return (
          <div className="space-y-1 font-mono">
            {entries.map(([k, v], i) => (
              <div key={`${k}-${i}`} className="grid grid-cols-[220px_1fr] gap-x-3">
                <span className="truncate text-slate-500">{k}</span>
                <span className="break-all text-slate-800">{v}</span>
              </div>
            ))}
          </div>
        );
      }
    } catch {
      /* fall through */
    }
  }
  // JSON
  try {
    return (
      <pre className="overflow-auto rounded bg-slate-50 p-3 font-mono whitespace-pre-wrap break-all">
        {JSON.stringify(JSON.parse(raw), null, 2)}
      </pre>
    );
  } catch {
    /* fall through */
  }
  return (
    <pre className="overflow-auto rounded bg-slate-50 p-3 font-mono whitespace-pre-wrap break-all">
      {raw}
    </pre>
  );
}
