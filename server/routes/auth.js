import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env, oktaUrls } from "../lib/env.js";
import { buildAuthorizeUrl, exchangeCode, newPkce, newState } from "../lib/okta.js";
import { decodeJwtParts } from "../lib/jwks.js";

export function createAuthRouter({ logger }) {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.get("/login", loginLimiter, (req, res) => {
    const { verifier, challenge } = newPkce();
    const state = newState();
    req.session.pkce = { verifier, state };
    const url = buildAuthorizeUrl({
      authorizeUrl: oktaUrls.authorize,
      clientId: env.OIDC_CLIENT_ID,
      redirectUri: env.OIDC_REDIRECT_URI,
      state,
      codeChallenge: challenge,
    });
    res.redirect(url);
  });

  router.get("/callback", async (req, res, next) => {
    try {
      const { code, state, error, error_description } = req.query;
      if (error) throw new Error(`${error}: ${error_description ?? ""}`);
      if (!code || !state) throw new Error("Missing code or state");
      if (!req.session.pkce || state !== req.session.pkce.state) {
        throw new Error("State mismatch");
      }
      const tokens = await exchangeCode({
        tokenUrl: oktaUrls.orgToken,
        clientId: env.OIDC_CLIENT_ID,
        clientSecret: env.OIDC_CLIENT_SECRET,
        redirectUri: env.OIDC_REDIRECT_URI,
        code,
        codeVerifier: req.session.pkce.verifier,
      });
      const { payload } = decodeJwtParts(tokens.id_token);
      req.session.idToken = tokens.id_token;
      req.session.user = {
        sub: payload.sub,
        name: payload.name ?? null,
        email: payload.email ?? null,
        preferred_username: payload.preferred_username ?? null,
      };
      delete req.session.pkce;
      logger.info({ sub: payload.sub }, "user logged in");

      // SPA is served by us (Vite middleware in dev, static in prod) on the same port.
      res.redirect("/");
    } catch (e) {
      next(e);
    }
  });

  router.post("/logout", (req, res) => {
    const sub = req.session?.user?.sub;
    req.session.destroy(() => {
      logger.info({ sub }, "user logged out");
      res.json({ ok: true });
    });
  });

  router.get("/me", (req, res) => {
    if (!req.session?.user) return res.json({ user: null });
    let idTokenDecoded = null;
    if (req.session.idToken) {
      try {
        const { header, payload } = decodeJwtParts(req.session.idToken);
        idTokenDecoded = {
          raw: req.session.idToken,
          header,
          payload,
        };
      } catch {
        /* ignore */
      }
    }
    res.json({ user: req.session.user, idToken: idTokenDecoded });
  });

  return router;
}
