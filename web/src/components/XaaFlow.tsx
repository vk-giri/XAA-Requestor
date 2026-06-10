import { useState } from "react";
import { api } from "../api";
import type { Token, User, XaaResult } from "../types";
import { StepCard } from "./StepCard";
import type { StepInfo } from "./StepCard";

const blank = (): Token => ({ raw: "", header: null, payload: null });

export function XaaFlow({ user, idToken }: { user: User; idToken: Token | null }) {
  const [result, setResult] = useState<XaaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    const { ok, data } = await api.runXaa();
    if (ok) {
      setResult(data as XaaResult);
    } else {
      setError(data.message ?? "XAA flow failed");
      setResult({
        tokens: {
          idToken: idToken ?? blank(),
          idJag: blank(),
          accessToken: blank(),
        },
        httpCalls: data.httpCalls ?? [],
        resource: null,
      });
    }
    setRunning(false);
  }

  const findCall = (prefix: string) =>
    result?.httpCalls.find((c) => c.stage.startsWith(prefix));

  const idJag = result?.tokens.idJag.raw ? result.tokens.idJag : undefined;
  const accessToken = result?.tokens.accessToken.raw ? result.tokens.accessToken : undefined;

  const steps: StepInfo[] = [
    {
      n: 1,
      title: "User signs in",
      tag: "OIDC",
      explanation:
        "The user authenticates with Okta (Authorization Code + PKCE). Okta returns an id_token proving who they are. This is the only step that involves the human — everything that follows is automated.",
      token: idToken ?? undefined,
      tokenLabel: "id_token",
    },
    {
      n: 2,
      title: "Exchange id_token for ID-JAG",
      tag: "Token Exchange",
      explanation:
        "The AI Agent presents the user's id_token to Okta and asks for an Identity Assertion JWT (ID-JAG) bound to a specific resource. The agent authenticates with its own private key (private_key_jwt).",
      call: findCall("step1"),
      token: idJag,
      tokenLabel: "ID-JAG",
    },
    {
      n: 3,
      title: "Redeem ID-JAG for an access token",
      tag: "JWT Bearer",
      explanation:
        "The agent presents the ID-JAG to the resource's authorization server (a Custom AS in Okta). It returns a short-lived access token scoped to the requested permissions.",
      call: findCall("step2"),
      token: accessToken,
      tokenLabel: "access_token",
    },
    {
      n: 4,
      title: "Call the protected resource",
      tag: "Bearer",
      explanation:
        "The agent calls the protected API with the access token. The resource server verifies the token's signature against Okta's JWKS — no further round-trip to Okta — and returns the data.",
      call: findCall("step3"),
    },
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/60 px-6 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="rounded-md bg-indigo-500/15 px-2 py-1 font-mono text-[11px] text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
            {user.sub}
          </span>
          {user.email && <span className="truncate text-slate-300">{user.email}</span>}
          {user.name && <span className="truncate text-xs text-slate-500">· {user.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="rounded-md bg-red-500/10 px-3 py-1 text-xs text-red-300 ring-1 ring-inset ring-red-500/30">
              {error}
            </span>
          )}
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50"
          >
            {running ? (
              <>
                <Spinner /> Running…
              </>
            ) : (
              <>
                Run XAA flow <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-4 lg:overflow-hidden">
        {steps.map((s, i) => (
          <div key={s.n} className="relative min-h-0">
            {i > 0 && (
              <div className="pointer-events-none absolute -left-[14px] top-1/2 hidden lg:block">
                <Arrow />
              </div>
            )}
            <StepCard step={s} />
          </div>
        ))}
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8h11m0 0L9 4m4 4-4 4"
        stroke="rgb(71 85 105)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
