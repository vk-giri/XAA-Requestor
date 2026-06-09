import { useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api";
import type { HttpCall, Token, User, XaaResult } from "../types";
import { HttpCallCard } from "./HttpCallCard";
import { TokenCard } from "./TokenCard";

const blankToken = (): Token => ({ raw: "", header: null, payload: null });

export function XaaFlow({ user, idToken }: { user: User; idToken: Token | null }) {
  const [result, setResult] = useState<XaaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

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

  const step1 = result?.httpCalls.find((c) => c.stage.startsWith("step1"));
  const step2 = result?.httpCalls.find((c) => c.stage.startsWith("step2"));
  const step3 = result?.httpCalls.find((c) => c.stage.startsWith("step3"));

  return (
    <div className="space-y-6">
      <UserCard user={user} />

      <div className="flex items-center gap-3">
        <button
          onClick={run}
          disabled={running}
          className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {running ? "Running…" : "Run XAA flow"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {idToken && (
        <Step n={0} title="OIDC login — ID token from Okta">
          <p className="text-sm text-slate-600">
            This is the user's <code className="font-mono">id_token</code> from the regular
            authorization-code login. The backend received it during{" "}
            <code className="font-mono">/auth/callback</code> and stored it in the session.
          </p>
          <TokenCard label="id_token" token={idToken} />
        </Step>
      )}

      {step1 && (
        <Step n={1} title="Org AS token exchange — id_token → ID-JAG">
          <p className="text-sm text-slate-600">
            The AI Agent (<code className="font-mono">wlp…</code> client) authenticates via{" "}
            <code className="font-mono">private_key_jwt</code> and exchanges the ID token for an
            ID-JAG bound to the Custom AS audience.
          </p>
          <HttpCallCard call={step1} />
          {result?.tokens.idJag.raw && <TokenCard label="ID-JAG" token={result.tokens.idJag} />}
        </Step>
      )}

      {step2 && (
        <Step n={2} title="Custom AS — ID-JAG → access token (jwt-bearer)">
          <p className="text-sm text-slate-600">
            Same AI Agent re-authenticates to the Custom AS and exchanges the ID-JAG (as the
            assertion in a <code className="font-mono">jwt-bearer</code> grant) for a Bearer access
            token usable on the resource API.
          </p>
          <HttpCallCard call={step2} />
          {result?.tokens.accessToken.raw && (
            <TokenCard label="access_token (Custom AS)" token={result.tokens.accessToken} />
          )}
        </Step>
      )}

      {step3 && (
        <Step n={3} title="Resource API — protected call with Bearer">
          <p className="text-sm text-slate-600">
            The resource server validates the Bearer JWT against the Custom AS JWKS, checks{" "}
            <code className="font-mono">iss</code> and <code className="font-mono">exp</code>, and
            returns the decoded claims.
          </p>
          <HttpCallCard call={step3} />
        </Step>
      )}
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">Authenticated user</h2>
      <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
        <dt className="text-slate-500">sub</dt>
        <dd className="font-mono">{user.sub}</dd>
        {user.email && (
          <>
            <dt className="text-slate-500">email</dt>
            <dd>{user.email}</dd>
          </>
        )}
        {user.name && (
          <>
            <dt className="text-slate-500">name</dt>
            <dd>{user.name}</dd>
          </>
        )}
        {user.preferred_username && (
          <>
            <dt className="text-slate-500">preferred_username</dt>
            <dd className="font-mono">{user.preferred_username}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">
          {n}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 pl-10">{children}</div>
    </section>
  );
}
