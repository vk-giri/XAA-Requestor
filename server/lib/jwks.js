import crypto from "node:crypto";

const TTL_MS = 5 * 60 * 1000;
const caches = new Map(); // jwksUrl -> { fetchedAt, keys: Map<kid, KeyObject> }

export function decodeJwtParts(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");
  const decode = (s) =>
    JSON.parse(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  return { header: decode(parts[0]), payload: decode(parts[1]), signing: `${parts[0]}.${parts[1]}`, signature: parts[2] };
}

async function getKey(jwksUrl, kid) {
  let entry = caches.get(jwksUrl);
  const stale = !entry || Date.now() - entry.fetchedAt > TTL_MS;
  if (stale || !entry?.keys.has(kid)) {
    const res = await fetch(jwksUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`JWKS ${res.status}: ${await res.text()}`);
    const { keys } = await res.json();
    entry = { fetchedAt: Date.now(), keys: new Map() };
    for (const jwk of keys) {
      entry.keys.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: "jwk" }));
    }
    caches.set(jwksUrl, entry);
  }
  const key = entry.keys.get(kid);
  if (!key) throw new Error(`No JWKS key matches kid=${kid}`);
  return key;
}

export async function verifyJwt(token, { jwksUrl, expectedIssuer }) {
  const { header, payload, signing, signature } = decodeJwtParts(token);
  if (header.alg !== "RS256") throw new Error(`Unsupported alg: ${header.alg}`);

  const key = await getKey(jwksUrl, header.kid);
  const sigBuf = Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const ok = crypto.createVerify("RSA-SHA256").update(signing).verify(key, sigBuf);
  if (!ok) throw new Error("Signature invalid");

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("Token expired");
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    throw new Error(`iss mismatch: ${payload.iss} != ${expectedIssuer}`);
  }
  return { header, payload };
}
