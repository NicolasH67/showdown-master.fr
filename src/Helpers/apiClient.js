/**
 * src/Helpers/apiClient.js
 *
 * Client HTTP minimaliste pour parler au backend en envoyant les cookies httpOnly.
 * Sélection automatique du BASE URL :
 *  - En prod (Vercel / non-localhost) → chemins relatifs ("/api")
 *  - En dev (localhost) → http://localhost:3001/api
 *  - VITE_API_BASE / REACT_APP_API_BASE / NEXT_PUBLIC_API_BASE priment si définies
 */

const ABSOLUTE = /^https?:\/\//i;

function resolveBase() {
  const explicit =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.REACT_APP_API_BASE ||
    null;

  if (explicit) {
    const trimmed = explicit.replace(/\/$/, "");
    // Si explicit vaut "/api", on laisse le BASE vide pour utiliser des chemins relatifs
    if (trimmed === "/api") return "";
    return trimmed; // peut être absolu (https://...) ou relatif ("/api")
  }

  // Si on est dans le navigateur et pas en localhost → utiliser chemins relatifs (serverless)
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return ""; // ex: requêtes vers "/api/..."
    }
  }

  // Fallback dev local
  return "http://localhost:3001/api";
}

const BASE = resolveBase();

function buildUrl(path) {
  if (ABSOLUTE.test(path)) return path; // on nous a donné une URL absolue

  // Normaliser le path (sans doubles /)
  const p = path.startsWith("/") ? path : `/${path}`;

  if (!BASE) {
    // BASE == "" → on veut des chemins relatifs côté Vercel (ex: "/api/public/...")
    return p;
  }

  // Si BASE contient déjà "/api" ET le path commence par "/api", ne pas dupliquer
  if (BASE.endsWith("/api") && p.startsWith("/api/")) {
    return `${BASE}${p.replace(/^\/api/, "")}`; // ex: http://.../api + /public/... ⇒ http://.../api/public/...
  }

  return `${BASE}${p}`;
}

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message || `HTTP error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function api(path, { method = "GET", body, headers } = {}) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    credentials: "include", // indispensable pour envoyer/recevoir le cookie httpOnly
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let payload = null;
    const ct = res.headers.get("content-type") || "";
    try {
      payload = ct.includes("application/json")
        ? await res.json()
        : await res.text();
    } catch (_) {}

    if (res.status === 401 || res.status === 403) {
      throw new ApiError("unauthorized", { status: res.status, body: payload });
    }

    throw new ApiError(
      payload?.error || payload?.message || `HTTP ${res.status}`,
      {
        status: res.status,
        body: payload,
      }
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await res.json();
  return await res.text();
}

// Helpers pratiques
export const get = (path, opts) =>
  api(path, { ...(opts || {}), method: "GET" });
export const post = (path, body, opts) =>
  api(path, { ...(opts || {}), method: "POST", body });
export const patch = (path, body, opts) =>
  api(path, { ...(opts || {}), method: "PATCH", body });
export const put = (path, body, opts) =>
  api(path, { ...(opts || {}), method: "PUT", body });
export const del = (path, opts) =>
  api(path, { ...(opts || {}), method: "DELETE" });

// Ping session avec fallback de chemin (prod: /api/auth/me, dev legacy: /auth/me)
export async function me() {
  try {
    const r = await get("/api/auth/me");
    return r;
  } catch (_) {
    try {
      const r2 = await get("/auth/me");
      return r2;
    } catch (e) {
      return { ok: false };
    }
  }
}
