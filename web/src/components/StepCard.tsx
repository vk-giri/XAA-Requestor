import { useState } from "react";
import type { ReactNode } from "react";
import type { HttpCall, Token } from "../types";

export interface StepInfo {
  n: number;
  title: string;
  tag?: string;
  explanation: string;
  call?: HttpCall;
  token?: Token;
  tokenLabel?: string;
}

export function StepCard({ step }: { step: StepInfo }) {
  const empty = !step.call && !step.token;
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/30 backdrop-blur">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-xs font-bold text-indigo-200 ring-1 ring-inset ring-indigo-500/30">
            {step.n}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{step.title}</div>
            {step.tag && (
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {step.tag}
              </div>
            )}
          </div>
        </div>
        {step.call && <StatusPill status={step.call.status} ms={step.call.durationMs} />}
      </div>

      {/* Explanation */}
      <div className="border-b border-slate-800 bg-slate-950/40 px-4 py-3">
        <p className="text-[12px] leading-relaxed text-slate-400">{step.explanation}</p>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-xs text-slate-500">
              Click <span className="font-medium text-slate-400">Run XAA flow</span> to populate.
            </p>
          </div>
        ) : (
          <>
            {step.call && (
              <div className="border-b border-slate-800 px-4 py-2.5 font-mono text-[11px]">
                <span className="font-semibold text-emerald-400">{step.call.method}</span>{" "}
                <span className="break-all text-slate-400">{step.call.url}</span>
              </div>
            )}

            <Section title="Response" defaultOpen accent="emerald">
              {step.token ? (
                <TokenView token={step.token} label={step.tokenLabel} />
              ) : step.call ? (
                <BodyView body={step.call.responseBody} />
              ) : null}
            </Section>

            {step.call && (
              <Section title="Request" defaultOpen={false} accent="violet">
                <RequestView call={step.call} />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status, ms }: { status: number; ms: number }) {
  const color =
    status === 0
      ? "bg-slate-500/15 text-slate-400 ring-slate-500/30"
      : status >= 500
        ? "bg-red-500/15 text-red-300 ring-red-500/30"
        : status >= 400
          ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
          : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
      <span
        className={`rounded px-1.5 py-0.5 font-mono font-semibold ring-1 ring-inset ${color}`}
      >
        {status === 0 ? "ERR" : status}
      </span>
      <span className="font-mono text-slate-500">{ms}ms</span>
    </div>
  );
}

function Section({
  title,
  defaultOpen,
  accent,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  accent: "emerald" | "violet";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dotColor = accent === "emerald" ? "bg-emerald-400" : "bg-violet-400";
  return (
    <div className="border-b border-slate-800 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300 transition hover:bg-slate-800/40"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <span>{title}</span>
        <span className="ml-auto text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function TokenView({ token, label }: { token: Token; label?: string }) {
  const [tab, setTab] = useState<"payload" | "header" | "raw">("payload");
  const [revealed, setRevealed] = useState(false);

  if (!token.raw) return <p className="text-xs text-slate-500">(no token)</p>;

  return (
    <div>
      {label && (
        <div className="mb-2 text-[11px] font-mono text-slate-500">
          {label} <span className="text-slate-600">· decoded</span>
        </div>
      )}
      <div className="mb-2 inline-flex rounded-md bg-slate-800/60 p-0.5">
        <Tab active={tab === "payload"} onClick={() => setTab("payload")}>
          Payload
        </Tab>
        <Tab active={tab === "header"} onClick={() => setTab("header")}>
          Header
        </Tab>
        <Tab active={tab === "raw"} onClick={() => setTab("raw")}>
          Raw
        </Tab>
      </div>
      {tab === "payload" && (
        <ClaimList claims={(token.payload as Record<string, unknown>) ?? {}} />
      )}
      {tab === "header" && <ClaimList claims={(token.header as Record<string, unknown>) ?? {}} />}
      {tab === "raw" && (
        <div>
          <button
            onClick={() => setRevealed(!revealed)}
            className="mb-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300"
          >
            {revealed ? "hide" : "reveal"}
          </button>
          <pre className="overflow-auto break-all whitespace-pre-wrap rounded-md bg-slate-950 p-2.5 font-mono text-[10px] leading-relaxed text-slate-400 ring-1 ring-inset ring-slate-800">
            {revealed ? token.raw : redact(token.raw)}
          </pre>
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-[11px] font-medium transition ${
        active ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

const TIMESTAMP_KEYS = new Set(["exp", "iat", "auth_time", "nbf"]);

function ClaimList({ claims }: { claims: Record<string, unknown> }) {
  const entries = Object.entries(claims);
  if (entries.length === 0) return <p className="text-xs text-slate-500">(empty)</p>;
  return (
    <dl className="space-y-1 font-mono text-[11px]">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[80px_1fr] gap-x-3">
          <dt className="truncate text-slate-500">{k}</dt>
          <dd className="break-all text-slate-200">{formatClaim(k, v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatClaim(key: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (TIMESTAMP_KEYS.has(key) && typeof v === "number") {
    const remaining = Math.round(v - Date.now() / 1000);
    const iso = new Date(v * 1000).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
    if (key === "exp") {
      return `${iso}  (${remaining > 0 ? `in ${remaining}s` : `${-remaining}s ago — expired`})`;
    }
    return iso;
  }
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function BodyView({ body }: { body: unknown }) {
  if (body === null || body === undefined) return <p className="text-xs text-slate-500">(empty)</p>;
  const text = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  return (
    <pre className="overflow-auto break-all whitespace-pre-wrap rounded-md bg-slate-950 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300 ring-1 ring-inset ring-slate-800">
      {text}
    </pre>
  );
}

function RequestView({ call }: { call: HttpCall }) {
  const [showHeaders, setShowHeaders] = useState(false);
  return (
    <div className="space-y-2">
      <div>
        <Label>Body</Label>
        {call.requestBody ? <FormOrJsonView raw={call.requestBody} /> : <Empty />}
      </div>
      <div>
        <button
          onClick={() => setShowHeaders(!showHeaders)}
          className="mb-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300"
        >
          {showHeaders ? "hide" : "show"} headers ({Object.keys(call.requestHeaders).length})
        </button>
        {showHeaders && <KvTable kv={call.requestHeaders} />}
      </div>
    </div>
  );
}

function FormOrJsonView({ raw }: { raw: string }) {
  // Form-urlencoded?
  if (raw.includes("=") && !raw.trim().startsWith("{")) {
    try {
      const params = new URLSearchParams(raw);
      const entries = Array.from(params.entries());
      if (entries.length > 0) return <KvTable kv={Object.fromEntries(entries)} dense />;
    } catch {
      /* fall through */
    }
  }
  try {
    return <BodyView body={JSON.parse(raw)} />;
  } catch {
    /* fall through */
  }
  return <BodyView body={raw} />;
}

function KvTable({ kv, dense = false }: { kv: Record<string, string>; dense?: boolean }) {
  const entries = Object.entries(kv);
  if (entries.length === 0) return <Empty />;
  return (
    <div className={`space-y-${dense ? "0.5" : "1"} font-mono text-[11px]`}>
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[140px_1fr] gap-x-3">
          <span className="truncate text-slate-500">{k}</span>
          <span className="break-all text-slate-300">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">{children}</div>;
}

function Empty() {
  return <p className="text-xs text-slate-600">(none)</p>;
}

function redact(t: string) {
  if (t.length <= 32) return t;
  return `${t.slice(0, 24)}…${t.slice(-12)}  (len=${t.length})`;
}
