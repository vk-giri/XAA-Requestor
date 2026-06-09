export function LoginGate() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="mb-2 text-xl font-semibold">Sign in to start the flow</h2>
      <p className="mx-auto mb-6 max-w-prose text-slate-600">
        You'll authenticate with Okta. After login, this page will show every HTTP call and decoded
        token in the Cross App Access exchange — useful for understanding what the backend is
        actually doing.
      </p>
      <a
        href="/auth/login"
        className="inline-block rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700"
      >
        Log in with Okta
      </a>
    </div>
  );
}
