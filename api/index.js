// api/index.js — Vercel serverless entry
// DÉLÈGUE TOUT au serveur Express exporté par ../backend/server.js

const app = require("../backend/server");

module.exports = (req, res) => app(req, res);
module.exports.default = module.exports;
