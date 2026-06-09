# secure-ai-sample

Okta Cross App Access (XAA / ID-JAG) **flow inspector**: a React SPA + Node backend that runs the full XAA exchange end-to-end and renders every wire-level call and decoded JWT so you can see exactly what's happening.

```
+-------------------+        +-------------------+        +----------------+
|  Express agent    |  STS   |  Okta org AS      |        |  Custom AS     |
|  + Vite SPA       | -----> |  /oauth2/v1/token | -----> |  jwt-bearer    |
|  (port 3000)      |        +-------------------+        +----------------+
+-------------------+                                              |
        |                                                          |
        +-----> Bearer access_token --------> Resource API (port 8081)
                                                      (verifies via JWKS)
```

Single port for the SPA + API in both dev and prod. In dev, Vite is mounted as Express middleware (HMR included). In prod, the built SPA is served as static files from `web/dist`.

## Run it (one command)

```bash
cp .env.example .env       # then fill values — see "Okta admin setup" below
npm install
npm run dev
```

That boots two labelled streams in one terminal:

- **agent** (port 3000) — Express backend + Vite middleware (SPA, HMR, OIDC login, XAA orchestration)
- **resource** (port 8081) — protected API, validates Bearer JWTs against the Custom AS JWKS

Open <http://localhost:3000>. Log in. Click **Run XAA flow**. You'll see four cards:

1. **Step 0** — your `id_token` from OIDC login (decoded header + payload)
2. **Step 1** — the `POST /oauth2/v1/token` token-exchange call (request, response, decoded ID-JAG)
3. **Step 2** — the `POST /oauth2/<asid>/v1/token` jwt-bearer redemption (decoded access token)
4. **Step 3** — the `GET` against your resource API (verified payload echoed back)

Each card is collapsible. Tokens are redacted by default with a **Reveal raw** toggle.

## Okta admin setup

You need three things in your Okta org:

### 1. OIDC Web App (user-facing login — the `0oa…` client)

- App Catalog → Create App Integration → OIDC → Web Application
- Sign-in redirect URI: `http://localhost:3000/auth/callback`
- Grant types: Authorization Code
- Note Client ID + Client Secret → `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET`

### 2. Custom Authorization Server (the resource AS)

Use the existing `default` AS or create a new one. Note its **asid** (the bit between `/oauth2/` and `/v1/`) → `CUSTOM_AS_ID`.

- **Scopes** → add a custom scope (e.g. `xaa:read`, `customInfo`) → put it in `XAA_SCOPE`. **Do not** use `openid` / `profile` / `email` — system scopes are stripped in the ID-JAG flow.
- **Access Policies** → default rule → enable grant type `urn:ietf:params:oauth:grant-type:jwt-bearer`

### 3. AI Agent (WORKLOAD client — the `wlp…` client)

Admin Console → AI Agents → Create new agent:

- Client Authentication: **Public Key / Private Key (`private_key_jwt`)**
- Generate a key → export it as **PEM**. Supply it to the app via one of:
  - `AGENT_PRIVATE_KEY_FILE=./agent-key.pem` (recommended — file path)
  - `AGENT_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----"` (inline; double-quote for multi-line, or use `\n` escapes)
  - If Okta only gave you a JWK, convert once with: `node -e 'const c=require("crypto"),fs=require("fs");const k=c.createPrivateKey({key:JSON.parse(fs.readFileSync(0,"utf8")),format:"jwk"});console.log(k.export({type:"pkcs8",format:"pem"}))' < jwk.json > agent-key.pem`
- Note Client ID (`wlp…`) → `AGENT_CLIENT_ID` and the **kid** → `AGENT_KEY_ID`
- **Connected Resources**:
  - Link to the OIDC Web App (above)
  - Link to the Custom AS (above), allowed scope = your `XAA_SCOPE`
- Status: **Active**

The `0oa…` client cannot perform XAA token exchange. The `wlp…` AI Agent must be the one signing the `client_assertion` JWT.

### 4. Feature flag

Confirm Cross App Access / Secure AI is enabled on your tenant: *Settings → Features*.

## Project layout

```
secure-ai-sample/
├── server/
│   ├── agent.js              # Express, port 3000
│   ├── resource.js           # protected API, port 8081
│   ├── lib/
│   │   ├── env.js            # zod-validated, frozen env
│   │   ├── logger.js         # pino with token redaction
│   │   ├── http-trace.js     # tracedFetch — records every call for the frontend
│   │   ├── jwks.js           # JWKS cache + RS256 verify
│   │   ├── okta.js           # PKCE, authorize URL, code exchange
│   │   └── xaa.js            # buildClientAssertion, getIdJag, redeemIdJag
│   └── routes/
│       ├── auth.js           # /auth/login, /auth/callback, /auth/logout, /auth/me
│       └── xaa.js            # POST /api/xaa — runs the flow, returns trace + tokens
└── web/
    ├── index.html, vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig.json
    └── src/
        ├── main.tsx, App.tsx, api.ts, jwt.ts, types.ts, index.css
        └── components/
            ├── LoginGate.tsx
            ├── XaaFlow.tsx
            ├── HttpCallCard.tsx
            └── TokenCard.tsx
```

## Production-shaped touches

- **helmet** for default security headers
- **express-session** with `httpOnly`, `sameSite: lax`, `secure: production`, ≥32-char secret
- **express-rate-limit** on `/auth/login` and `/api/xaa` (20 req/min/IP)
- **pino** structured logging with request IDs and token-field redaction
- **zod** env validation at startup — fails fast with the offending field
- **AbortSignal** 15 s timeout on every Okta call
- Graceful shutdown on SIGTERM/SIGINT
- Strict ESLint flat config, Prettier
- TypeScript on the SPA (`strict`, `noUnusedLocals`)

This is **demo-grade**, not production-deployable: HTTPS / TLS, distributed sessions, real CSRF for the SPA, secrets management, and proper observability are still your responsibility for any real deployment.

## Scripts

```
npm run dev      # one-command dev (agent + resource + vite)
npm run build    # build SPA into web/dist
npm start        # agent + resource only (run after npm run build)
npm run lint
npm run format
```

## Common errors

| Symptom | Fix |
|---|---|
| `invalid_client: Invalid value for 'client_id' parameter` on Step 1 | The `wlp…` agent isn't Active, isn't linked to the OIDC web app, or isn't connected to the Custom AS. Or the agent ID was copied wrong. |
| `invalid_request: 'requested_token_type' is invalid` | You're authenticating Step 1 with the `0oa…` OIDC client instead of the `wlp…` AI Agent. |
| `invalid_scope` mentioning `openid` | Use a custom scope on the Custom AS — system scopes are stripped from ID-JAG. |
| `access_denied: no_matching_policy` on Step 2 | Custom AS access policy missing the `jwt-bearer` grant. |
| `ECONNREFUSED 127.0.0.1:8081` on Step 3 | The resource server isn't running (`npm run dev` starts it). |
| `Key is not valid JSON` at startup | `AGENT_PRIVATE_KEY_JWK` got mangled. Keep raw single-line JSON, no surrounding quotes. |

## What's out of scope

Token caching / refresh between `/api/xaa` calls. CSRF beyond OAuth `state`. HTTPS / certs. A test suite. Containerisation.
