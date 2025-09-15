/**
 * auth/tokens.js
 *
 * Utilitaires pour signer et vérifier des JWT côté serveur.
 * - Algo: HS256
 * - Secret: process.env.JWT_SECRET
 * - Expiration par défaut: 12h (surchargable via JWT_EXPIRES_IN)
 */

const jwt = require("jsonwebtoken");

const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h"; // ex: "12h", "1d"

/**
 * Signe un JWT avec le payload fourni.
 * @param {object} payload - ex: { scope: "admin" | "viewer", tournament_id: number }
 * @param {object} [opts]
 * @param {string} [opts.expiresIn] - ex: "12h", "1d"
 * @returns {string} token
 */
function sign(payload, opts = {}) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: opts.expiresIn || DEFAULT_EXPIRES_IN,
  });
}

/**
 * Vérifie et décode un JWT.
 * @param {string} token
 * @returns {object} payload décodé si valide
 * @throws en cas d'invalidité/expiration
 */
function verify(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
  });
}

/**
 * Options de cookie standardisées pour la session httpOnly.
 * NOTE: en prod, assure-toi de servir en HTTPS et mets COOKIE_SECURE=true
 */
function buildCookieOptions() {
  const secure =
    String(process.env.COOKIE_SECURE || "").toLowerCase() === "true" ||
    process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
    // maxAge doit être fourni lors du set si nécessaire
  };
}

/**
 * Pose le cookie de session avec le token fourni.
 * @param {import('express').Response} res
 * @param {string} token
 * @param {number} [maxAgeMs] durée en ms (ex: 12h)
 */
function setSessionCookie(res, token, maxAgeMs) {
  const name = process.env.COOKIE_NAME || "sm_session";
  const opts = buildCookieOptions();
  if (typeof maxAgeMs === "number") opts.maxAge = maxAgeMs;
  res.cookie(name, token, opts);
}

/**
 * Supprime le cookie de session.
 * @param {import('express').Response} res
 */
function clearSessionCookie(res) {
  const name = process.env.COOKIE_NAME || "sm_session";
  const opts = buildCookieOptions();
  res.clearCookie(name, opts);
}

module.exports = {
  sign,
  verify,
  buildCookieOptions,
  setSessionCookie,
  clearSessionCookie,
};
