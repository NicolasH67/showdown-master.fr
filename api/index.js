// api/index.js — Vercel API single entrypoint
// Délègue toutes les routes à l'app Express définie dans backend/server.js
// (compatible ESM/CJS) et sans serverless-http.

import * as mod from "../backend/server.js";

// Supporte `export default app` (ESM) ou `module.exports = app` (CJS)
const app = mod?.default || mod;

// Laisse Express gérer le body (utile si tu as des webhooks / raw bodies)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  try {
    // Express app est un handler (req, res)
    return app(req, res);
  } catch (e) {
    console.error("[api/index] fatal handler error:", e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "server_error" }));
  }
}
