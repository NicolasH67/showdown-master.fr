// backend/server.js
// Petit serveur HTTP local qui réutilise le routeur Vercel `api/index.js`

require("dotenv").config();
const http = require("http");

// Création du serveur HTTP qui délègue toutes les requêtes
// au handler exporté par ../api/index.js
const server = http.createServer(async (req, res) => {
  try {
    // import dynamique pour supporter le module ESM `export default`
    const mod = await import("../api/index.js");
    const handler = mod.default || mod;

    // On laisse le handler Next/Vercel gérer entièrement req/res
    return handler(req, res);
  } catch (e) {
    console.error("[bridge] error calling ../api/index.js handler", e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "server_bridge_error",
        message: e?.message || String(e),
      })
    );
  }
});

// Lancement uniquement en local (pas sur Vercel)
if (require.main === module && !process.env.VERCEL) {
  const port = process.env.PORT || 3001;
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`Local API bridge running on ${host}:${port}`);
    console.log("Using handler from ../api/index.js");
  });
}

module.exports = server;
module.exports.default = server;
