// api/index.js — Vercel serverless entry point (ESM-friendly)
// Délègue tout à l'app Express définie dans backend/server.js

import app from "../backend/server.js";

export default function handler(req, res) {
  return app(req, res);
}
