import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env, oktaUrls } from "../lib/env.js";
import { getIdJag, redeemIdJag } from "../lib/xaa.js";
import { newTrace, tracedFetch } from "../lib/http-trace.js";
import { decodeJwtParts } from "../lib/jwks.js";

function tokenBundle(raw) {
  try {
    const { header, payload } = decodeJwtParts(raw);
    return { raw, header, payload };
  } catch {
    return { raw, header: null, payload: null };
  }
}

export function createXaaRouter({ logger }) {
  const router = Router();

  const limiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

  router.post("/xaa", limiter, async (req, res) => {
    if (!req.session?.idToken) return res.status(401).json({ error: "not_authenticated" });
    const trace = newTrace();
    try {
      const step1 = await getIdJag(
        {
          orgTokenUrl: oktaUrls.orgToken,
          agentClientId: env.AGENT_CLIENT_ID,
          agentKeyId: env.AGENT_KEY_ID,
          agentPrivateKey: env.agentPrivateKey,
          idToken: req.session.idToken,
          audience: oktaUrls.customAsIssuer,
          scope: env.XAA_SCOPE,
        },
        { trace },
      );
      logger.info({ stage: "step1" }, "ID-JAG issued");

      const step2 = await redeemIdJag(
        {
          customAsTokenUrl: oktaUrls.customAsToken,
          agentClientId: env.AGENT_CLIENT_ID,
          agentKeyId: env.AGENT_KEY_ID,
          agentPrivateKey: env.agentPrivateKey,
          idJag: step1.access_token,
        },
        { trace },
      );
      logger.info({ stage: "step2" }, "Custom AS access token issued");

      let resourceResult = null;
      try {
        resourceResult = await tracedFetch(
          env.RESOURCE_API_URL,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${step2.access_token}`,
              accept: "application/json",
            },
          },
          { trace, stage: `step3: GET ${env.RESOURCE_API_URL}` },
        );
      } catch (e) {
        // Already recorded in trace by tracedFetch. Don't fail the whole flow —
        // the user can still inspect step1+step2.
        logger.warn({ err: e.message }, "resource fetch failed (continuing)");
        resourceResult = { error: e.message, cause: e.cause?.code ?? null };
      }

      res.json({
        tokens: {
          idToken: tokenBundle(req.session.idToken),
          idJag: tokenBundle(step1.access_token),
          accessToken: tokenBundle(step2.access_token),
        },
        httpCalls: trace,
        resource: resourceResult,
      });
    } catch (e) {
      logger.error({ err: e.message, stage: e.stage, status: e.status }, "xaa flow failed");
      // Return what we have — partial trace is still useful.
      res.status(502).json({
        error: "xaa_failed",
        message: e.message,
        stage: e.stage ?? null,
        status: e.status ?? null,
        responseBody: e.body ?? null,
        httpCalls: trace,
      });
    }
  });

  return router;
}
