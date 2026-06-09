import type { MeResponse, XaaResult } from "./types";

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (!res.ok) {
    const err = new Error(
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`,
    ) as Error & { body?: unknown; status?: number };
    err.body = body;
    err.status = res.status;
    throw err;
  }
  return body as T;
}

export const api = {
  me: () => jsonFetch<MeResponse>("/auth/me"),
  logout: () => jsonFetch<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  runXaa: async (): Promise<{ ok: boolean; data: XaaResult | Record<string, unknown> }> => {
    const res = await fetch("/api/xaa", { method: "POST", credentials: "include" });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  },
};
