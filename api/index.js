// api/index.js — Vercel serverless entry that wraps the Express app
// The Express app is exported from backend/server.js

const app = require("../backend/server");

// Vercel expects a function (req, res) for Node runtimes
module.exports = (req, res) => app(req, res);

// Optional: ESM default export compatibility (not strictly required)
module.exports.default = module.exports;
