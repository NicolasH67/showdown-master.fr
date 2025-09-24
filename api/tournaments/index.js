// api/tournaments/index.js — proxy vers l'app Express complète
// Permet d'exposer TOUTES les routes définies dans backend/server.js
// via /api/tournaments (et sous-chemins) sur Vercel.

import app from "../../backend/server";

export default function handler(req, res) {
  // Vercel passe l'URL complète (ex: /api/tournaments/19/matches),
  // Express router dans backend/server.js gère les sous-routes.
  return app(req, res);
}
