export function LoginGate() {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center shadow-xl backdrop-blur">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
        <span className="text-xl font-bold text-white">X</span>
      </div>
      <h2 className="mb-3 text-2xl font-semibold text-slate-100">Cross App Access — live demo</h2>
      <p className="mx-auto mb-8 max-w-prose text-sm leading-relaxed text-slate-400">
        Authenticate with Okta. After login, every wire-level call between the agent, the org
        authorization server, the custom authorization server, and the protected resource is shown
        side-by-side with decoded JWTs. Useful for understanding what XAA actually does on the
        wire.
      </p>
      <a
        href="/auth/login"
        className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:to-violet-500"
      >
        Log in with Okta
        <span aria-hidden>→</span>
      </a>
    </div>
  );
}
