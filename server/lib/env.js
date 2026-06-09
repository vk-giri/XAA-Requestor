import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    RESOURCE_PORT: z.coerce.number().int().positive().default(8081),

    OKTA_DOMAIN: z.string().url().refine((v) => !v.endsWith("/"), "no trailing slash"),

    OIDC_CLIENT_ID: z.string().min(1),
    OIDC_CLIENT_SECRET: z.string().min(1),
    OIDC_REDIRECT_URI: z.string().url(),

    AGENT_CLIENT_ID: z.string().min(1),
    AGENT_KEY_ID: z.string().min(1),
    AGENT_PRIVATE_KEY_PEM: z.string().optional(),
    AGENT_PRIVATE_KEY_FILE: z.string().optional(),

    CUSTOM_AS_ID: z.string().min(1),
    XAA_SCOPE: z.string().min(1),

    RESOURCE_API_URL: z.string().url(),

    SESSION_SECRET: z.string().min(32, "must be ≥32 chars for cookie signing"),
  })
  .superRefine((data, ctx) => {
    const provided = [data.AGENT_PRIVATE_KEY_PEM, data.AGENT_PRIVATE_KEY_FILE].filter(
      (v) => v && v.length > 0,
    ).length;
    if (provided !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AGENT_PRIVATE_KEY_*"],
        message: "set exactly one of AGENT_PRIVATE_KEY_PEM or AGENT_PRIVATE_KEY_FILE",
      });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

function loadAgentPrivateKey(data) {
  let pem;
  if (data.AGENT_PRIVATE_KEY_PEM) {
    // Allow either real newlines or escaped "\n" (handy for single-line .env entries).
    pem = data.AGENT_PRIVATE_KEY_PEM.includes("\n")
      ? data.AGENT_PRIVATE_KEY_PEM
      : data.AGENT_PRIVATE_KEY_PEM.replace(/\\n/g, "\n");
  } else {
    pem = fs.readFileSync(data.AGENT_PRIVATE_KEY_FILE, "utf8");
  }
  if (!pem.includes("-----BEGIN")) {
    throw new Error("expected PEM-encoded key (must contain '-----BEGIN'-style markers)");
  }
  return crypto.createPrivateKey({ key: pem, format: "pem" });
}

let agentPrivateKey;
try {
  agentPrivateKey = loadAgentPrivateKey(parsed.data);
} catch (e) {
  console.error(`Failed to load agent private key: ${e.message}`);
  process.exit(1);
}

export const env = Object.freeze({ ...parsed.data, agentPrivateKey });

export const oktaUrls = Object.freeze({
  authorize: `${env.OKTA_DOMAIN}/oauth2/v1/authorize`,
  orgToken: `${env.OKTA_DOMAIN}/oauth2/v1/token`,
  customAsIssuer: `${env.OKTA_DOMAIN}/oauth2/${env.CUSTOM_AS_ID}`,
  customAsToken: `${env.OKTA_DOMAIN}/oauth2/${env.CUSTOM_AS_ID}/v1/token`,
  customAsKeys: `${env.OKTA_DOMAIN}/oauth2/${env.CUSTOM_AS_ID}/v1/keys`,
});
