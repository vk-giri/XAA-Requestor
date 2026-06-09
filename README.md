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


## Scripts

```
npm run dev      # one-command dev (agent + resource + vite)
npm run build    # build SPA into web/dist
npm start        # agent + resource only (run after npm run build)
npm run lint
npm run format
```