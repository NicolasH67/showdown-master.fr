/**
 * middlewares/auth.js
 *
 * Garde d'accès basées sur un JWT stocké en cookie httpOnly (ou Authorization: Bearer ...).
 * Les routes protégées doivent inclure un param :id correspondant au tournament_id ciblé.
 */

const { verify } = require("../auth/tokens");

/**
 * Récupère le token depuis le cookie httpOnly ou l'en-tête Authorization.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function readTokenFromReq(req) {
  const name = process.env.COOKIE_NAME || "sm_session";
  const fromCookie = req.cookies?.[name];
  if (fromCookie) return fromCookie;
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/**
 * Vérifie qu'un utilisateur (viewer OU admin) est authentifié pour le tournoi :id.
 * Si ok, attache req.auth = { scope, tournament_id, ... } et appelle next().
 * Sinon: 401 (pas de token / invalide) ou 403 (mauvais tournoi).
 */
function requireViewerOrAdminForTournament(req, res, next) {
  try {
    const token = readTokenFromReq(req);
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = verify(token);
    // payload attendu: { scope: 'viewer' | 'admin', tournament_id: number }
    if (!payload || !payload.tournament_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (String(payload.tournament_id) !== String(req.params.id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.auth = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Vérifie qu'un admin du tournoi :id est authentifié.
 * Repose sur requireViewerOrAdminForTournament, puis vérifie scope === 'admin'.
 */
function requireAdminForTournament(req, res, next) {
  requireViewerOrAdminForTournament(req, res, function () {
    if (req.auth?.scope !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }
    next();
  });
}

module.exports = {
  readTokenFromReq,
  requireViewerOrAdminForTournament,
  requireAdminForTournament,
};
