// api/index.js — Vercel serverless entry point
// Délègue tout à l'app Express définie dans backend/server.js

const app = require("../backend/server");

module.exports = (req, res) => app(req, res);
module.exports.default = module.exports;
