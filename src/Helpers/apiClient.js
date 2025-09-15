/**
 * src/Helpers/apiClient.js
 *
 * Client HTTP minimaliste pour parler au backend en envoyant les cookies httpOnly.
 * - Utilise VITE_API_BASE si défini, sinon fallback localhost:3001
 * - Ajoute credentials: 'include' pour que le cookie de session soit envoyé
 * - Sérialise/désérialise JSON
 * - Lève des erreurs explicites sur 401/403 afin que le front redirige si besoin
 */

const API_BASE = (
  import.meta?.env?.VITE_API_BASE ?? "http://localhost:3001"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message || `HTTP error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function api(path, { method = "GET", body, headers } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    credentials: "include", // indispensable pour envoyer/recevoir le cookie httpOnly
    body: body != null ? JSON.stringify(body) : undefined,
  });

  // Gestion des réponses non-OK
  if (!res.ok) {
    let payload = null;
    const ct = res.headers.get("content-type") || "";
    try {
      payload = ct.includes("application/json")
        ? await res.json()
        : await res.text();
    } catch (_) {}

    // Cas particulier: 401/403 => le caller pourra rediriger (login)
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

  // Réponses OK
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  // Si ce n'est pas du JSON, renvoyer le texte brut
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

// Petit util: ping session
export async function me() {
  try {
    const r = await get("/auth/me");
    return r;
  } catch (e) {
    return { ok: false };
  }
}
