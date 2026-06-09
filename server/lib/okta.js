import crypto from "node:crypto";
import { tracedFetch } from "./http-trace.js";

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function newPkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function newState() {
  return b64url(crypto.randomBytes(16));
}

export function buildAuthorizeUrl({ authorizeUrl, clientId, redirectUri, state, codeChallenge }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${authorizeUrl}?${params.toString()}`;
}

export async function exchangeCode({
  tokenUrl,
  clientId,
  clientSecret,
  redirectUri,
  code,
  codeVerifier,
}) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return tracedFetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${auth}`,
      accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });
}
