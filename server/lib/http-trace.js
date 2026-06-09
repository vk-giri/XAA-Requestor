// Wraps fetch to record one entry per call into a per-request trace array.
// The trace is returned to the frontend so the user can see every wire-level call.

const DEFAULT_TIMEOUT_MS = 15_000;

export function newTrace() {
  return [];
}

function headersToObject(h) {
  if (!h) return {};
  if (h instanceof Headers) return Object.fromEntries(h.entries());
  return { ...h };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function tracedFetch(url, init = {}, { trace, stage } = {}) {
  const start = Date.now();
  const method = init.method || "GET";
  const requestHeaders = headersToObject(init.headers);
  const requestBody = init.body == null ? null : String(init.body);

  let entry = {
    stage,
    method,
    url,
    requestHeaders,
    requestBody,
    status: 0,
    responseHeaders: {},
    responseBody: null,
    durationMs: 0,
    ok: false,
  };

  try {
    const res = await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    const text = await res.text();
    const parsed = safeJsonParse(text);

    entry = {
      ...entry,
      status: res.status,
      responseHeaders: Object.fromEntries(res.headers.entries()),
      responseBody: parsed,
      durationMs: Date.now() - start,
      ok: res.ok,
    };

    if (trace) trace.push(entry);

    if (!res.ok) {
      const err = new Error(`${method} ${url} failed (${res.status})`);
      err.status = res.status;
      err.body = parsed;
      err.stage = stage;
      throw err;
    }
    return parsed;
  } catch (e) {
    if (entry.status === 0 && trace) {
      // Network-level failure (DNS, refused, timeout) — record what we have.
      entry.durationMs = Date.now() - start;
      entry.responseBody = { error: e.message, cause: e.cause?.code ?? null };
      trace.push(entry);
    }
    throw e;
  }
}
