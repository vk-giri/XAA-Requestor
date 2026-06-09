import crypto from "node:crypto";
import { tracedFetch } from "./http-trace.js";

const TOKEN_TYPE_ID_TOKEN = "urn:ietf:params:oauth:token-type:id_token";
const TOKEN_TYPE_ID_JAG = "urn:ietf:params:oauth:token-type:id-jag";
const GRANT_TOKEN_EXCHANGE = "urn:ietf:params:oauth:grant-type:token-exchange";
const GRANT_JWT_BEARER = "urn:ietf:params:oauth:grant-type:jwt-bearer";
const CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function buildClientAssertion({ clientId, audience, kid, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid };
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: audience,
    iat: now,
    exp: now + 300,
    jti: crypto.randomUUID(),
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  return `${signingInput}.${b64url(sig)}`;
}

export async function getIdJag(
  { orgTokenUrl, agentClientId, agentKeyId, agentPrivateKey, idToken, audience, scope },
  { trace } = {},
) {
  const body = new URLSearchParams({
    grant_type: GRANT_TOKEN_EXCHANGE,
    subject_token: idToken,
    subject_token_type: TOKEN_TYPE_ID_TOKEN,
    requested_token_type: TOKEN_TYPE_ID_JAG,
    audience,
    scope,
    client_id: agentClientId,
    client_assertion_type: CLIENT_ASSERTION_TYPE,
    client_assertion: buildClientAssertion({
      clientId: agentClientId,
      audience: orgTokenUrl,
      kid: agentKeyId,
      privateKey: agentPrivateKey,
    }),
  }).toString();

  return tracedFetch(
    orgTokenUrl,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
    },
    { trace, stage: "step1: id_token → ID-JAG (org AS)" },
  );
}

export async function redeemIdJag(
  { customAsTokenUrl, agentClientId, agentKeyId, agentPrivateKey, idJag },
  { trace } = {},
) {
  const body = new URLSearchParams({
    grant_type: GRANT_JWT_BEARER,
    assertion: idJag,
    client_id: agentClientId,
    client_assertion_type: CLIENT_ASSERTION_TYPE,
    client_assertion: buildClientAssertion({
      clientId: agentClientId,
      audience: customAsTokenUrl,
      kid: agentKeyId,
      privateKey: agentPrivateKey,
    }),
  }).toString();

  return tracedFetch(
    customAsTokenUrl,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
    },
    { trace, stage: "step2: ID-JAG → access_token (Custom AS)" },
  );
}
