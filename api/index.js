// api/index.js — Vercel entry point
// Import the Express app defined in backend/server.js
const app = require("../backend/server");

// Export handler for Vercel (serverless function)
module.exports = (req, res) => app(req, res);

// Optional default export for ESM compatibility
module.exports.default = module.exports;
