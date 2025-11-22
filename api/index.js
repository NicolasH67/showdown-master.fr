// api/index.js — routeur unique pour Vercel (sans Express)
// Couvre :
// - /api/tournaments (+ /:id, /:id/players|groups|clubs|referees|matches, PATCH players/matches, POST create)
// - /api/public/tournaments (+ /:id et sous-ressources)
// - /api/auth/admin/login, /api/auth/tournament/login, /api/auth/logout, /api/auth/me
// - /api/send-email-code, /api/verify-email-code (gracieux si SMTP non configuré)

//
// --------- Utils bas niveau ---------
function applyCors(req, res) {
  const origin =
    req.headers.origin ||
    (req.headers.host ? `https://${req.headers.host}` : "*");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

async function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}
function send(res, status, payload, type = "application/json") {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(type === "application/json" ? JSON.stringify(payload) : payload);
}
function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function b64urlJSON(obj) {
  return b64url(JSON.stringify(obj));
}

// HMAC SHA-256 (Edge-friendly)
async function hmacSHA256(key, data) {
  // Web Crypto (Vercel Edge)
  if (globalThis.crypto?.subtle) {
    const enc = new TextEncoder();
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      enc.encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await globalThis.crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      enc.encode(data)
    );
    return Buffer.from(sigBuf)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
  // Node fallback (ESM import)
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", key)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// JWT sign/verify (async)
async function signJWT(payload, secret, expMs = 12 * 60 * 60 * 1000) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + Math.floor(expMs / 1000), ...payload };
  const part1 = b64urlJSON(header);
  const part2 = b64urlJSON(body);
  const sig = await hmacSHA256(secret, `${part1}.${part2}`);
  return `${part1}.${part2}.${sig}`;
}
async function verifyJWT(token, secret) {
  const [h, p, s] = String(token || "").split(".");
  if (!h || !p || !s) return null;
  const expected = await hmacSHA256(secret, `${h}.${p}`);
  if (expected !== s) return null;
  const json = JSON.parse(Buffer.from(p, "base64").toString("utf8"));
  if (json.exp && Math.floor(Date.now() / 1000) > json.exp) return null;
  return json;
}

function setCookie(res, name, value, maxAgeMs) {
  const attrs = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  res.setHeader("Set-Cookie", attrs.join("; "));
}
function clearCookie(res, name) {
  res.setHeader(
    "Set-Cookie",
    `${name}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`
  );
}

function headers(SERVICE_KEY) {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
}
function supabaseBase() {
  return (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}
async function sFetch(path, init = {}) {
  const mergedHeaders = {
    Accept: "application/json",
    ...(init && init.headers ? init.headers : {}),
  };
  const r = await fetch(`${supabaseBase()}${path}`, {
    ...init,
    headers: mergedHeaders,
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

function parseUrl(req) {
  return new URL(req.url, `https://${req.headers.host || "localhost"}`);
}

// SHA-256 hex (Edge-friendly)
async function sha256Hex(s) {
  if (globalThis.crypto?.subtle) {
    const enc = new TextEncoder();
    const buf = await globalThis.crypto.subtle.digest("SHA-256", enc.encode(s));
    return Buffer.from(buf).toString("hex");
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(s).digest("hex");
}

// UUID (Edge-friendly)
async function cryptoRandom() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const { randomUUID } = await import("node:crypto");
  return randomUUID();
}

// ---- Auth helpers (JWT in cookie) ----
async function getAuthFromCookie(req) {
  const COOKIE = process.env.COOKIE_NAME || "sm_session";
  const SECRET = process.env.JWT_SECRET || "change-me";
  const cookie = String(req.headers.cookie || "");
  const m = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  const token = m ? m[1] : null;
  if (!token) return null;
  return verifyJWT(token, SECRET);
}

async function isAdminForTournament(req, tournamentId) {
  try {
    const payload = await getAuthFromCookie(req);
    return (
      payload &&
      payload.scope === "admin" &&
      Number(payload.tournament_id) === Number(tournamentId)
    );
  } catch {
    return false;
  }
}

//
// --------- Handlers REST Supabase ---------
async function handleListTournaments(req, res, searchParams) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/tournament?select=id,title,startday,endday,is_private&order=startday.asc`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}
  const past = searchParams.get("past");
  if (past !== null) {
    const isPast = past === "1" || past === "true";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ts = +today;
    data = data.filter((t) => {
      const s = Date.parse(t?.startday || "");
      const e = Date.parse(t?.endday || "");
      const current =
        (Number.isFinite(s) ? s <= ts : true) &&
        (Number.isFinite(e) ? ts <= e : true);
      const future = Number.isFinite(s)
        ? s > ts
        : Number.isFinite(e)
        ? e > ts
        : true;
      const pastT = Number.isFinite(e) ? e < ts : false;
      return isPast ? pastT : current || future;
    });
  }
  return send(res, 200, data);
}
async function handleGetTournament(req, res, id) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/tournament?id=eq.${id}&select=id,title,startday,endday,is_private`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {}
  const obj = Array.isArray(arr) ? arr[0] : null;
  return obj ? send(res, 200, obj) : send(res, 404, { error: "not_found" });
}
// ---- Admin-specific tournament helpers (do not alter public handlers) ----
async function handleAdminGetTournament(req, res, id) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/tournament?id=eq.${id}&select=id,title,startday,endday,is_private,email,table_count,match_duration,location`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {}
  const obj = Array.isArray(arr) ? arr[0] : null;
  return obj ? send(res, 200, obj) : send(res, 404, { error: "not_found" });
}

async function handleAdminListTournaments(req, res, searchParams) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/tournament?select=id,title,startday,endday,is_private,email,table_count,match_duration,location&order=startday.asc`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}

  // Reprend la même logique de filtrage "past" que handleListTournaments
  const past = searchParams.get("past");
  if (past !== null) {
    const isPast = past === "1" || past === "true";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ts = +today;
    data = data.filter((t) => {
      const s = Date.parse(t?.startday || "");
      const e = Date.parse(t?.endday || "");
      const current =
        (Number.isFinite(s) ? s <= ts : true) &&
        (Number.isFinite(e) ? ts <= e : true);
      const future = Number.isFinite(s)
        ? s > ts
        : Number.isFinite(e)
        ? e > ts
        : true;
      const pastT = Number.isFinite(e) ? e < ts : false;
      return isPast ? pastT : current || future;
    });
  }

  return send(res, 200, data);
}

// Normalize PATCH payload from admin frontend into DB column names
function normalizeAdminTournamentPatchBody(body) {
  const out = {};

  if (body == null || typeof body !== "object") return out;

  // Title
  if (body.title !== undefined) out.title = body.title;

  // Dates (frontend can send startDay/endDay or startday/endday)
  if (body.startDay !== undefined) out.startday = body.startDay;
  if (body.startday !== undefined) out.startday = body.startday;
  if (body.endDay !== undefined) out.endday = body.endDay;
  if (body.endday !== undefined) out.endday = body.endday;

  // Email
  if (body.email !== undefined) out.email = body.email;

  // Table count (table_count or tableCount)
  if (body.table_count !== undefined) out.table_count = body.table_count;
  if (body.tableCount !== undefined) out.table_count = body.tableCount;

  // Match duration (match_duration or matchDuration)
  if (body.match_duration !== undefined)
    out.match_duration = body.match_duration;
  if (body.matchDuration !== undefined) out.match_duration = body.matchDuration;

  // Location
  if (body.location !== undefined) out.location = body.location;

  // Privacy flag (is_private or isPrivate)
  if (body.is_private !== undefined) out.is_private = body.is_private;
  if (body.isPrivate !== undefined) out.is_private = body.isPrivate;

  return out;
}

async function handleAdminPatchTournament(req, res, id, body) {
  const payload = normalizeAdminTournamentPatchBody(body);

  if (!payload || Object.keys(payload).length === 0) {
    return send(res, 400, { error: "empty_patch" });
  }

  const { ok, status, text } = await sFetch(
    `/rest/v1/tournament?id=eq.${id}&select=id,title,startday,endday,is_private,email,table_count,match_duration,location`,
    {
      method: "PATCH",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  return send(res, status, ok ? JSON.parse(text) : text);
}

// Handler: Change admin/user/ereferee password for a tournament
async function handleAdminChangePassword(req, res, id, body) {
  // Only admin of this tournament can change passwords
  const admin = await isAdminForTournament(req, id);
  if (!admin) {
    return send(res, 401, { error: "unauthorized" });
  }

  const bcrypt = await getBcrypt();
  if (!bcrypt) {
    return send(res, 500, { error: "bcrypt_unavailable" });
  }

  const type = String(body?.type || "").trim(); // "admin" | "user" | "ereferee"
  const oldPassword = String(body?.oldPassword || "").trim();
  const newPassword = String(body?.newPassword || "").trim();

  if (!type || !["admin", "user", "ereferee"].includes(type)) {
    return send(res, 400, { error: "invalid_type" });
  }

  // Pour l'admin, le nouveau mot de passe est obligatoire
  if (type === "admin" && !newPassword) {
    return send(res, 400, { error: "new_password_required_for_admin" });
  }

  // On récupère les hash actuels
  const { ok, status, text } = await sFetch(
    `/rest/v1/tournament?id=eq.${id}&select=id,admin_password_hash,user_password_hash,ereferee_password_hash`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");

  let arr = [];
  try {
    arr = JSON.parse(text || "[]");
  } catch {}
  const t = Array.isArray(arr) ? arr[0] : null;
  if (!t) {
    return send(res, 404, { error: "not_found" });
  }

  let currentHash = null;
  if (type === "admin") currentHash = t.admin_password_hash || null;
  if (type === "user") currentHash = t.user_password_hash || null;
  if (type === "ereferee") currentHash = t.ereferee_password_hash || null;

  // Si un mot de passe existe déjà, on vérifie l'ancien
  if (currentHash) {
    if (!oldPassword) {
      return send(res, 400, { error: "old_password_required" });
    }
    let passOk = false;
    if (typeof currentHash === "string" && currentHash.startsWith("$2")) {
      passOk = await bcrypt.compare(oldPassword, currentHash);
    } else {
      // fallback legacy plaintext
      passOk = oldPassword === String(currentHash);
    }
    if (!passOk) {
      return send(res, 401, { error: "old_password_invalid" });
    }
  }

  // Pour user/ereferee, newPassword peut être vide -> on efface le mot de passe
  let newHash = null;
  if (newPassword) {
    newHash = await bcrypt.hash(newPassword, 10);
  }

  const patch = {};
  if (type === "admin") {
    patch.admin_password_hash = newHash;
  }
  if (type === "user") {
    patch.user_password_hash = newHash;
    patch.is_private = !!newPassword;
  }
  if (type === "ereferee") {
    patch.ereferee_password_hash = newHash;
  }

  const {
    ok: ok2,
    status: status2,
    text: text2,
  } = await sFetch(`/rest/v1/tournament?id=eq.${id}&select=id`, {
    method: "PATCH",
    headers: {
      ...headers(process.env.SUPABASE_SERVICE_KEY),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });

  if (!ok2) return send(res, status2, text2, "application/json");
  let updatedArr = [];
  try {
    updatedArr = JSON.parse(text2 || "[]");
  } catch {}

  const updated = Array.isArray(updatedArr) ? updatedArr[0] : updatedArr;
  return send(res, 200, {
    ok: true,
    id: updated?.id ?? id,
    type,
  });
}
// Delete a tournament as admin
async function handleAdminDeleteTournament(req, res, id) {
  // Only admin of this tournament can delete it
  const admin = await isAdminForTournament(req, id);
  if (!admin) {
    return send(res, 401, { error: "unauthorized" });
  }

  const { ok, status, text } = await sFetch(`/rest/v1/tournament?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      ...headers(process.env.SUPABASE_SERVICE_KEY),
      Prefer: "return=minimal",
    },
  });

  if (!ok) {
    return send(res, status, text, "application/json");
  }

  return send(res, 200, { ok: true, deleted: true, id });
}
async function handleCreateTournament(req, res, body) {
  // Lecture des champs de base
  const title = body?.title;
  const startday = body?.startday;
  const endday = body?.endday;
  const email = body?.email;
  const table_count = body?.table_count ?? 4;
  const match_duration = body?.match_duration ?? 30;
  const location = body?.location ?? null;

  // Mot de passe fourni côté frontend pour la création
  const rawAdminPwd =
    typeof body?.adminPassword === "string" ? body.adminPassword.trim() : "";

  let passwordHash = null;

  if (rawAdminPwd) {
    const bcrypt = await getBcrypt();
    if (!bcrypt) {
      return send(res, 500, { error: "bcrypt_unavailable" });
    }
    passwordHash = await bcrypt.hash(rawAdminPwd, 10);
  }

  // is_private :
  // - si un mot de passe est fourni -> on force true
  // - sinon on reprend le comportement d'avant (défaut true si non précisé)
  let is_private = body?.is_private;
  if (typeof is_private !== "boolean") {
    is_private = true;
  }
  if (passwordHash) {
    is_private = true;
  }

  const payload = {
    title,
    startday,
    endday,
    email,
    table_count,
    match_duration,
    location,
    is_private,
    // On applique le même hash aux deux colonnes comme demandé
    admin_password_hash: passwordHash,
    user_password_hash: passwordHash,
  };

  const { ok, status, text } = await sFetch(
    `/rest/v1/tournament?select=id,title,startday,endday,is_private`,
    {
      method: "POST",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );
  return send(res, ok ? 201 : status, ok ? JSON.parse(text) : text);
}
async function handleListPlayers(req, res, id) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/player?tournament_id=eq.${id}&select=id,firstname,lastname,tournament_id,group_id,club:club_id(id,name,abbreviation)&order=lastname.asc`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}
  return send(res, 200, data);
}

async function handleCreatePlayers(req, res, id, body) {
  // Admin-only: must be admin for this tournament
  const admin = await isAdminForTournament(req, id);
  if (!admin) return send(res, 401, { error: "unauthorized" });

  // Accept a single object or an array under `players`
  const rows = Array.isArray(body?.players)
    ? body.players
    : Array.isArray(body)
    ? body
    : body && typeof body === "object"
    ? [body]
    : [];

  if (!rows.length) return send(res, 400, { error: "missing_payload" });

  // Normalize and validate each row; minimally require firstname/lastname
  const payload = [];
  for (const r of rows) {
    const firstname = String(r?.firstname || "").trim();
    const lastname = String(r?.lastname || "").trim();
    if (!firstname || !lastname) {
      return send(res, 400, { error: "missing_player_name" });
    }
    const obj = {
      firstname,
      lastname,
      tournament_id: id,
    };
    if (r?.club_id != null) obj.club_id = Number(r.club_id) || null;
    if (r?.group_id != null) obj.group_id = r.group_id; // may be array per your schema
    if (r?.category != null) obj.category = r.category;
    payload.push(obj);
  }

  const { ok, status, text } = await sFetch(
    `/rest/v1/player?select=id,firstname,lastname,club_id,group_id,tournament_id,created_at,updated_at`,
    {
      method: "POST",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!ok) return send(res, status, text, "application/json");
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {}
  return send(res, 201, Array.isArray(arr) ? arr : [arr]);
}
async function handlePatchPlayer(req, res, playerId, body) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/player?id=eq.${playerId}&select=*`,
    {
      method: "PATCH",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    }
  );
  return send(res, status, ok ? JSON.parse(text) : text);
}

// Fetch a single player by id
async function handleGetPlayer(req, res, playerId) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/player?id=eq.${playerId}&select=id,firstname,lastname,club_id,group_id,tournament_id,category,created_at,updated_at`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {}
  const obj = Array.isArray(arr) ? arr[0] : null;
  return obj ? send(res, 200, obj) : send(res, 404, { error: "not_found" });
}

// List players by group_id contains groupId
async function handleListPlayersByGroupId(req, res, groupId) {
  const filter = encodeURIComponent(JSON.stringify([Number(groupId)]));
  const { ok, status, text } = await sFetch(
    `/rest/v1/player?group_id=cs.${filter}&select=id,firstname,lastname,group_id,tournament_id,club_id,category,created_at,updated_at`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}
  return send(res, 200, data);
}
async function handleListGroups(req, res, id) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/group?tournament_id=eq.${id}&select=id,name,group_type,round_type,tournament_id,highest_position&order=name.asc`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}
  return send(res, 200, data);
}

async function handleCreateGroup(req, res, id, body) {
  // Admin-only: must be admin for this tournament
  const admin = await isAdminForTournament(req, id);
  if (!admin) return send(res, 401, { error: "unauthorized" });

  // Accept single object or an array under `groups`
  const rows = Array.isArray(body?.groups)
    ? body.groups
    : Array.isArray(body)
    ? body
    : body && typeof body === "object"
    ? [body]
    : [];

  if (!rows.length) return send(res, 400, { error: "missing_payload" });

  // Normalize each row; minimally require name
  const payload = [];
  for (const r of rows) {
    const name = String(r?.name || "").trim();
    if (!name) return send(res, 400, { error: "missing_group_name" });
    const obj = {
      name,
      tournament_id: id,
      round_type: r?.round_type ?? null,
      group_type: r?.group_type ?? null,
      highest_position: r?.highest_position ?? null,
      // passthroughs if provided by UI
      group_former: r?.group_former ?? null,
    };
    payload.push(obj);
  }

  const { ok, status, text } = await sFetch(
    `/rest/v1/group?select=id,name,group_type,round_type,tournament_id,highest_position,created_at,updated_at`,
    {
      method: "POST",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!ok) return send(res, status, text, "application/json");
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {}
  return send(res, 201, Array.isArray(arr) ? arr : [arr]);
}
async function handleListClubs(req, res, id) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/club?tournament_id=eq.${id}&select=id,name,abbreviation,tournament_id,created_at,updated_at&order=name.asc`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}
  return send(res, 200, data);
}
async function handleCreateClub(req, res, id, body) {
  // Admin-only: must be admin for this tournament
  const admin = await isAdminForTournament(req, id);
  if (!admin) return send(res, 401, { error: "unauthorized" });

  const name = String(body?.name || "").trim();
  const abbreviation = String(body?.abbreviation || "").trim();
  if (!name || !abbreviation) {
    return send(res, 400, { error: "missing_fields" });
  }

  const payload = [{ name, abbreviation, tournament_id: id }];
  const { ok, status, text } = await sFetch(
    `/rest/v1/club?select=id,name,abbreviation,tournament_id,created_at,updated_at`,
    {
      method: "POST",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );
  if (!ok) return send(res, status, text, "application/json");
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {}
  const obj = Array.isArray(arr) ? arr[0] : null;
  return send(res, 201, obj || { ok: true });
}
async function handleListReferees(req, res, id) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/referee?tournament_id=eq.${id}&select=id,firstname,lastname,tournament_id,club_id,created_at,updated_at,club:club_id(id,name,abbreviation)&order=lastname.asc&order=firstname.asc`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}
  return send(res, 200, data);
}

async function handleCreateReferee(req, res, id, body) {
  // Admin-only: must be admin for this tournament
  const admin = await isAdminForTournament(req, id);
  if (!admin) return send(res, 401, { error: "unauthorized" });

  const firstname = String(body?.firstname || "").trim();
  const lastname = String(body?.lastname || "").trim();
  const clubIdRaw = body?.club_id;
  if (!firstname || !lastname) {
    return send(res, 400, { error: "missing_fields" });
  }
  const payload = [
    {
      firstname,
      lastname,
      club_id:
        clubIdRaw === null || clubIdRaw === undefined
          ? null
          : Number(clubIdRaw) || null,
      tournament_id: id,
    },
  ];

  const { ok, status, text } = await sFetch(
    `/rest/v1/referee?select=id,firstname,lastname,club_id,tournament_id,created_at,updated_at`,
    {
      method: "POST",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!ok) return send(res, status, text, "application/json");
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {}
  const obj = Array.isArray(arr) ? arr[0] : null;
  return send(res, 201, obj || { ok: true });
}
async function handleListMatches(req, res, id) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/match?tournament_id=eq.${id}&select=id,tournament_id,group_id,match_day,match_time,table_number,player1:player1_id(id,firstname,lastname,club_id),player2:player2_id(id,firstname,lastname,club_id),group:group_id(id,name,group_type,group_former,highest_position),referee_1:referee1_id(id,firstname,lastname),referee_2:referee2_id(id,firstname,lastname),player1_group_position,player2_group_position,result&order=match_day.asc&order=match_time.asc&order=table_number.asc`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}
  return send(res, 200, data);
}
async function handlePatchMatch(req, res, matchId, body) {
  const { ok, status, text } = await sFetch(
    `/rest/v1/match?id=eq.${matchId}&select=*`,
    {
      method: "PATCH",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    }
  );
  return send(res, status, ok ? JSON.parse(text) : text);
}

async function handleCreateMatches(req, res, id, body) {
  // Admin-only: must be admin for this tournament
  const admin = await isAdminForTournament(req, id);
  if (!admin) return send(res, 401, { error: "unauthorized" });

  // Accept a single object, an array, or { matches: [...] }
  const rows = Array.isArray(body?.matches)
    ? body.matches
    : Array.isArray(body)
    ? body
    : body && typeof body === "object"
    ? [body]
    : [];

  if (!rows.length) return send(res, 400, { error: "missing_payload" });

  // Normalize each row with minimal required fields
  const payload = [];
  for (const m of rows) {
    const match_day = m?.match_day ?? m?.match_date ?? null;
    const match_time = m?.match_time ?? null;
    const table_number =
      m?.table_number != null ? Number(m.table_number) : null;

    if (
      (!m?.player1_id && !m?.player1_group_position) ||
      (!m?.player2_id && !m?.player2_group_position) ||
      !match_day ||
      !match_time ||
      table_number == null
    ) {
      return send(res, 400, { error: "matches_incomplete_data" });
    }

    payload.push({
      player1_id: m.player1_id ?? null,
      player2_id: m.player2_id ?? null,
      player1_group_position: m.player1_id
        ? null
        : m.player1_group_position ?? null,
      player2_group_position: m.player2_id
        ? null
        : m.player2_group_position ?? null,
      result: Array.isArray(m.result) ? m.result : [],
      match_day,
      match_time,
      table_number,
      tournament_id: id,
      group_id: m.group_id ?? null,
      referee1_id: m.referee1_id ?? null,
      referee2_id: m.referee2_id ?? null,
    });
  }

  const { ok, status, text } = await sFetch(
    `/rest/v1/match?select=id,tournament_id,group_id,match_day,match_time,table_number,player1_id,player2_id,player1_group_position,player2_group_position,result,referee1_id,referee2_id,created_at,updated_at`,
    {
      method: "POST",
      headers: {
        ...headers(process.env.SUPABASE_SERVICE_KEY),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!ok) return send(res, status, text, "application/json");
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {}
  return send(res, 201, Array.isArray(arr) ? arr : [arr]);
}

// List matches by group_id
async function handleListMatchesByGroup(req, res, groupIdRaw) {
  const gid = Number(groupIdRaw);
  if (!Number.isFinite(gid)) {
    // groupId invalide → on renvoie une erreur claire
    return send(res, 400, {
      error: "invalid_group_id",
      message: "groupId must be a valid integer",
      groupId: groupIdRaw,
    });
  }

  const { ok, status, text } = await sFetch(
    `/rest/v1/match?group_id=eq.${gid}&select=id,tournament_id,group_id,match_day,match_time,table_number,player1_id,player2_id,player1_group_position,player2_group_position,result,referee1_id,referee2_id,created_at,updated_at`,
    { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
  );
  if (!ok) return send(res, status, text, "application/json");
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {}
  return send(res, 200, data);
}

//
// Small helper to load bcryptjs in both CJS/ESM environments
async function getBcrypt() {
  // Try CommonJS first (Node runtime on Vercel supports this in serverless funcs)
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    const mod = require("bcryptjs");
    return mod?.default ?? mod;
  } catch (_) {
    // Fall back to dynamic ESM import
    try {
      const mod = await import("bcryptjs");
      return mod?.default ?? mod;
    } catch (e2) {
      return null; // not installed
    }
  }
}

// --------- AUTH (JWT cookie maison) ---------
async function handleAdminLogin(req, res, body) {
  try {
    const DEBUG = String(process.env.DEBUG_AUTH || "false") === "true";
    const bcrypt = await getBcrypt();
    const COOKIE = process.env.COOKIE_NAME || "sm_session";
    const SECRET = process.env.JWT_SECRET || "change-me";
    const idNum = Number(body?.tournamentId);
    const pwd = String(body?.password || "").trim();
    if (!Number.isFinite(idNum) || !pwd)
      return send(res, 400, { error: "Missing fields" });

    const { ok, status, text } = await sFetch(
      `/rest/v1/tournament?id=eq.${idNum}&select=id,admin_password_hash,user_password_hash`,
      { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
    );
    if (!ok) return send(res, status, text, "application/json");
    const arr = JSON.parse(text || "[]");
    const t = arr[0];
    if (!t) return send(res, 404, { error: "not_found" });

    const candidate = t.admin_password_hash || t.user_password_hash || "";
    let passOk = false;
    if (typeof candidate === "string" && candidate.startsWith("$2")) {
      if (!bcrypt) {
        if (DEBUG)
          console.error("[AUTH] bcryptjs not available while hash is bcrypt.");
        return send(res, 500, { error: "bcrypt_unavailable" });
      }
      passOk = await bcrypt.compare(pwd, candidate);
    } else {
      // legacy plaintext (rare / migration)
      passOk = pwd === String(candidate);
    }
    if (!passOk) return send(res, 401, { error: "Invalid credentials" });

    const token = await signJWT(
      { scope: "admin", tournament_id: idNum },
      SECRET
    );
    setCookie(res, COOKIE, token, 12 * 60 * 60 * 1000);
    return send(res, 200, { ok: true });
  } catch (e) {
    if (String(process.env.DEBUG_AUTH || "false") === "true") {
      return send(res, 500, {
        error: "server_error_login",
        message: e?.message || null,
      });
    }
    return send(res, 500, { error: "server_error_login" });
  }
}
async function handleViewerLogin(req, res, body) {
  try {
    const DEBUG = String(process.env.DEBUG_AUTH || "false") === "true";
    const bcrypt = await getBcrypt();
    const COOKIE = process.env.COOKIE_NAME || "sm_session";
    const SECRET = process.env.JWT_SECRET || "change-me";
    const idNum = Number(body?.tournamentId);
    const pwd = String(body?.password || "").trim();
    if (!Number.isFinite(idNum) || !pwd)
      return send(res, 400, { error: "Missing fields" });

    const { ok, status, text } = await sFetch(
      `/rest/v1/tournament?id=eq.${idNum}&select=id,user_password_hash,is_private`,
      { headers: headers(process.env.SUPABASE_SERVICE_KEY) }
    );
    if (!ok) return send(res, status, text, "application/json");
    const arr = JSON.parse(text || "[]");
    const t = arr[0];
    if (!t) return send(res, 404, { error: "not_found" });
    if (t.is_private !== true)
      return send(res, 400, { error: "tournament_public" });

    const candidate = t.user_password_hash || "";
    let passOk = false;
    if (typeof candidate === "string" && candidate.startsWith("$2")) {
      if (!bcrypt) {
        if (DEBUG)
          console.error("[AUTH] bcryptjs not available while hash is bcrypt.");
        return send(res, 500, { error: "bcrypt_unavailable" });
      }
      passOk = await bcrypt.compare(pwd, candidate);
    } else {
      passOk = pwd === String(candidate);
    }
    if (!passOk) return send(res, 401, { error: "Invalid credentials" });

    const token = await signJWT(
      { scope: "viewer", tournament_id: idNum },
      SECRET
    );
    setCookie(res, COOKIE, token, 12 * 60 * 60 * 1000);
    return send(res, 200, { ok: true });
  } catch (e) {
    if (String(process.env.DEBUG_AUTH || "false") === "true") {
      return send(res, 500, {
        error: "server_error_login",
        message: e?.message || null,
      });
    }
    return send(res, 500, { error: "server_error_login" });
  }
}

// Switch current session from admin to viewer for the same tournament
async function handleSwitchToViewer(req, res) {
  try {
    const COOKIE = process.env.COOKIE_NAME || "sm_session";
    const SECRET = process.env.JWT_SECRET || "change-me";

    // On récupère le payload actuel depuis le cookie
    const payload = await getAuthFromCookie(req);
    const tid = Number(payload?.tournament_id);

    // On n'autorise ce switch que si la session actuelle est bien admin
    // pour un tournoi valide.
    if (!payload || payload.scope !== "admin" || !Number.isFinite(tid)) {
      return send(res, 401, { error: "not_admin" });
    }

    // On signe un nouveau JWT en scope "viewer" pour le même tournoi
    const token = await signJWT(
      { scope: "viewer", tournament_id: tid },
      SECRET
    );
    // On réécrit le cookie de session
    setCookie(res, COOKIE, token, 12 * 60 * 60 * 1000);

    return send(res, 200, {
      ok: true,
      scope: "viewer",
      tournamentId: tid,
    });
  } catch (e) {
    const DEBUG = String(process.env.DEBUG_AUTH || "false") === "true";
    if (DEBUG) {
      return send(res, 500, {
        error: "server_error_switch_to_viewer",
        message: e?.message || null,
      });
    }
    return send(res, 500, { error: "server_error_switch_to_viewer" });
  }
}
function handleLogout(_req, res) {
  const COOKIE = process.env.COOKIE_NAME || "sm_session";
  clearCookie(res, COOKIE);
  return send(res, 200, { ok: true });
}
async function handleMe(req, res) {
  const COOKIE = process.env.COOKIE_NAME || "sm_session";
  const SECRET = process.env.JWT_SECRET || "change-me";
  const cookie = String(req.headers.cookie || "");
  const m = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  const token = m ? m[1] : null;
  if (!token) return send(res, 200, { ok: false });
  const payload = await verifyJWT(token, SECRET);
  if (!payload) return send(res, 200, { ok: false });
  return send(res, 200, {
    ok: true,
    scope: payload.scope,
    tournamentId: payload.tournament_id,
  });
}

//
// --------- Email code (gracieux) ---------
const volatileStore = new Map();
function sixDigit() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function handleSendEmailCode(req, res, body) {
  const email = String(body?.email || "").trim();
  if (!email) return send(res, 400, { error: "Missing email" });

  const code = sixDigit();
  const salt = await cryptoRandom();
  const codeHash = await sha256Hex(`${code}:${salt}`);
  const requestId = await cryptoRandom();
  const expires = Date.now() + 10 * 60 * 1000;
  volatileStore.set(requestId, { email, codeHash, salt, expires, attempts: 0 });

  const devPayload =
    process.env.NODE_ENV !== "production" ? { devCode: code } : {};

  const hasSMTP = process.env.SMTP_HOST && process.env.SMTP_USER;
  if (hasSMTP) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const tr = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await tr.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.SMTP_USER ||
          "noreply@example.com",
        to: email,
        subject: "Code de vérification",
        text: `Votre code de vérification est : ${code}`,
      });
    } catch (_e) {
      // ne plante pas l'API
    }
  }
  return send(res, 200, { ok: true, requestId, ...devPayload });
}

async function handleVerifyEmailCode(req, res, body) {
  const requestId = String(body?.requestId || "");
  const code = String(body?.code || "");
  if (!requestId || !code) return send(res, 400, { error: "Missing fields" });
  const row = volatileStore.get(requestId);
  if (!row)
    return send(res, 404, { verified: false, error: "request_not_found" });
  if (Date.now() > row.expires)
    return send(res, 400, { verified: false, error: "expired" });
  if (row.attempts >= 5)
    return send(res, 429, { verified: false, error: "too_many_attempts" });

  const ok = (await sha256Hex(`${code}:${row.salt}`)) === row.codeHash;
  volatileStore.set(requestId, { ...row, attempts: row.attempts + 1 });
  if (ok) volatileStore.delete(requestId);
  return send(res, 200, { verified: ok });
}

//
// --------- Router central ---------
export default async function handler(req, res) {
  try {
    // CORS for all routes
    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    // Sanity env check pour éviter 500 opaques
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return send(res, 500, { error: "supabase_env_missing" });
    }

    const { pathname: rawPathname, searchParams } = parseUrl(req);
    const pathname = rawPathname.replace(/\/{2,}/g, "/");

    // ---- DEBUG
    if (req.method === "GET" && pathname === "/api/debug/health") {
      return send(res, 200, { ok: true, now: new Date().toISOString() });
    }
    if (req.method === "GET" && pathname === "/api/debug/env") {
      const flags = {
        node: process.version,
        nodeEnv: process.env.NODE_ENV || null,
        vercel: !!process.env.VERCEL,
        hasSUPABASE_URL: !!process.env.SUPABASE_URL,
        hasSERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
        hasJWT_SECRET: !!process.env.JWT_SECRET,
      };
      return send(res, 200, flags);
    }
    if (req.method === "GET" && pathname === "/api/debug/auth") {
      const bcrypt = await getBcrypt();
      return send(res, 200, { bcrypt: !!bcrypt });
    }

    // ---- AUTH
    if (req.method === "POST" && pathname === "/api/auth/admin/login") {
      const body = await readJson(req);
      return handleAdminLogin(req, res, body);
    }
    if (req.method === "POST" && pathname === "/api/auth/tournament/login") {
      const body = await readJson(req);
      return handleViewerLogin(req, res, body);
    }
    if (
      req.method === "POST" &&
      pathname === "/api/auth/tournament/switch-to-viewer"
    ) {
      return handleSwitchToViewer(req, res);
    }
    if (req.method === "POST" && pathname === "/api/auth/logout") {
      return handleLogout(req, res);
    }
    if (req.method === "GET" && pathname === "/api/auth/me") {
      res.setHeader("Cache-Control", "no-store");
      return handleMe(req, res);
    }

    // ---- EMAIL CODE
    // Support optional trailing slash to be more tolerant with frontend base URLs
    if (req.method === "POST" && /^\/api\/send-email-code\/?$/.test(pathname)) {
      const body = await readJson(req);
      return handleSendEmailCode(req, res, body);
    }
    if (
      req.method === "POST" &&
      /^\/api\/verify-email-code\/?$/.test(pathname)
    ) {
      const body = await readJson(req);
      return handleVerifyEmailCode(req, res, body);
    }

    // ---- TOURNAMENTS (public + privé mêmes handlers REST)
    if (req.method === "GET" && /^\/api\/tournaments\/?$/.test(pathname)) {
      return handleListTournaments(req, res, searchParams);
    }
    if (req.method === "POST" && /^\/api\/tournaments\/?$/.test(pathname)) {
      const body = await readJson(req);
      return handleCreateTournament(req, res, body);
    }

    // ---- ADMIN TOURNAMENTS (separate admin API, without altering public ones)
    if (
      req.method === "GET" &&
      /^\/api\/admin\/tournaments\/?$/.test(pathname)
    ) {
      const idQ = searchParams.get("id");
      if (idQ != null) {
        const idNum = Number(idQ);
        if (!Number.isFinite(idNum)) {
          return send(res, 400, { error: "invalid_tournament_id" });
        }
        return handleAdminGetTournament(req, res, idNum);
      }
      // no id -> list tournaments for admin
      return handleAdminListTournaments(req, res, searchParams);
    }

    const mAdminT = pathname.match(/^\/api\/admin\/tournaments\/(\d+)\/?$/);
    if (mAdminT) {
      const idNum = Number(mAdminT[1]);
      if (req.method === "GET") {
        return handleAdminGetTournament(req, res, idNum);
      }
      if (req.method === "PATCH") {
        const body = await readJson(req);
        return handleAdminPatchTournament(req, res, idNum, body);
      }
      if (req.method === "DELETE") {
        return handleAdminDeleteTournament(req, res, idNum);
      }
    }

    const mAdminPwd = pathname.match(
      /^\/api\/admin\/tournaments\/(\d+)\/password\/?$/
    );
    if (mAdminPwd && req.method === "POST") {
      const idNum = Number(mAdminPwd[1]);
      if (!Number.isFinite(idNum)) {
        return send(res, 400, { error: "invalid_tournament_id" });
      }
      const body = await readJson(req);
      return handleAdminChangePassword(req, res, idNum, body);
    }

    // Aliases with query ?id=
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/players\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListPlayers(req, res, id);
    }
    if (
      req.method === "POST" &&
      /^\/api\/tournaments\/players\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      const body = await readJson(req);
      return handleCreatePlayers(req, res, id, body);
    }
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/groups\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListGroups(req, res, id);
    }
    if (
      req.method === "POST" &&
      /^\/api\/tournaments\/groups\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      const body = await readJson(req);
      return handleCreateGroup(req, res, id, body);
    }
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/clubs\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListClubs(req, res, id);
    }
    if (
      req.method === "POST" &&
      /^\/api\/tournaments\/clubs\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      const body = await readJson(req);
      return handleCreateClub(req, res, id, body);
    }
    if (
      req.method === "POST" &&
      /^\/api\/tournaments\/referees?\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      const body = await readJson(req);
      return handleCreateReferee(req, res, id, body);
    }
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/referees?\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListReferees(req, res, id);
    }
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/matches\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListMatches(req, res, id);
    }

    if (
      req.method === "POST" &&
      /^\/api\/tournaments\/matches\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      const body = await readJson(req);
      return handleCreateMatches(req, res, id, body);
    }

    const mT = pathname.match(/^\/api\/tournaments\/(\d+)\/?$/);
    if (req.method === "GET" && mT) {
      return handleGetTournament(req, res, Number(mT[1]));
    }

    // sous-ressources
    const mPlayers = pathname.match(/^\/api\/tournaments\/(\d+)\/players\/?$/);
    if (req.method === "GET" && mPlayers)
      return handleListPlayers(req, res, Number(mPlayers[1]));
    const mPostPlayers = pathname.match(
      /^\/api\/tournaments\/(\d+)\/players\/?$/
    );
    if (req.method === "POST" && mPostPlayers) {
      const body = await readJson(req);
      return handleCreatePlayers(req, res, Number(mPostPlayers[1]), body);
    }
    const mPatchPlayer = pathname.match(
      /^\/api\/tournaments\/(\d+)\/players\/(\d+)\/?$/
    );
    if (req.method === "PATCH" && mPatchPlayer) {
      const body = await readJson(req);
      return handlePatchPlayer(req, res, Number(mPatchPlayer[2]), body);
    }

    const mGroups = pathname.match(/^\/api\/tournaments\/(\d+)\/groups\/?$/);
    if (mGroups) {
      const idNum = Number(mGroups[1]);
      if (req.method === "GET") {
        return handleListGroups(req, res, idNum);
      }
      if (req.method === "POST") {
        const body = await readJson(req);
        return handleCreateGroup(req, res, idNum, body);
      }
    }

    const mClubs = pathname.match(/^\/api\/tournaments\/(\d+)\/clubs?\/?$/);
    if (mClubs) {
      const idNum = Number(mClubs[1]);
      if (req.method === "GET") {
        return handleListClubs(req, res, idNum);
      }
      if (req.method === "POST") {
        const body = await readJson(req);
        return handleCreateClub(req, res, idNum, body);
      }
    }

    const mRefs = pathname.match(/^\/api\/tournaments\/(\d+)\/referees?\/?$/);
    if (mRefs) {
      const idNum = Number(mRefs[1]);
      if (req.method === "GET") {
        return handleListReferees(req, res, idNum);
      }
      if (req.method === "POST") {
        const body = await readJson(req);
        return handleCreateReferee(req, res, idNum, body);
      }
    }

    const mMatches = pathname.match(/^\/api\/tournaments\/(\d+)\/matches\/?$/);
    if (mMatches) {
      const idNum = Number(mMatches[1]);
      if (req.method === "GET") {
        return handleListMatches(req, res, idNum);
      }
      if (req.method === "POST") {
        const body = await readJson(req);
        return handleCreateMatches(req, res, idNum, body);
      }
    }
    const mPatchMatch = pathname.match(
      /^\/api\/tournaments\/(\d+)\/matches\/(\d+)\/?$/
    );
    if (req.method === "PATCH" && mPatchMatch) {
      const body = await readJson(req);
      return handlePatchMatch(req, res, Number(mPatchMatch[2]), body);
    }

    // ---- Custom REST routes for players, groups, and matches
    // /api/players?groupId=...
    if (req.method === "GET" && /^\/api\/players\/?$/.test(pathname)) {
      const groupIdParam = searchParams.get("groupId");
      if (groupIdParam != null) {
        const gid = Number(groupIdParam);
        if (!Number.isFinite(gid)) {
          return send(res, 400, { error: "invalid_group_id" });
        }
        return handleListPlayersByGroupId(req, res, gid);
      }
      return send(res, 400, { error: "missing_filter" });
    }

    // /api/players/:id GET and PATCH (id can be numeric or UUID)
    const mPlainPlayer = pathname.match(/^\/api\/players\/([^/]+)\/?$/);
    if (mPlainPlayer) {
      const playerId = mPlainPlayer[1]; // keep as string
      if (req.method === "GET") {
        return handleGetPlayer(req, res, playerId);
      }
      if (req.method === "PATCH") {
        const body = await readJson(req);
        return handlePatchPlayer(req, res, playerId, body);
      }
    }

    // /api/groups/:id/matches GET (id transmis tel quel, validé dans le handler)
    const mGroupMatchesPlain = pathname.match(
      /^\/api\/groups\/([^/]+)\/matches\/?$/
    );
    if (mGroupMatchesPlain && req.method === "GET") {
      const gidRaw = mGroupMatchesPlain[1]; // peut être "undefined", sera validé dans handleListMatchesByGroup
      return handleListMatchesByGroup(req, res, gidRaw);
    }

    // /api/matches/:id PATCH (id can be numeric or UUID)
    const mPlainMatch = pathname.match(/^\/api\/matches\/([^/]+)\/?$/);
    if (mPlainMatch && req.method === "PATCH") {
      const matchId = mPlainMatch[1]; // keep as string
      const body = await readJson(req);
      return handlePatchMatch(req, res, matchId, body);
    }

    // ---- PUBLIC mirroir
    if (
      req.method === "GET" &&
      /^\/api\/public\/tournaments\/?$/.test(pathname)
    ) {
      return handleListTournaments(req, res, searchParams);
    }
    const mpT = pathname.match(/^\/api\/public\/tournaments\/(\d+)\/?$/);
    if (req.method === "GET" && mpT)
      return handleGetTournament(req, res, Number(mpT[1]));
    const mpPlayers = pathname.match(
      /^\/api\/public\/tournaments\/(\d+)\/players\/?$/
    );
    if (req.method === "GET" && mpPlayers)
      return handleListPlayers(req, res, Number(mpPlayers[1]));
    const mpGroups = pathname.match(
      /^\/api\/public\/tournaments\/(\d+)\/groups\/?$/
    );
    if (req.method === "GET" && mpGroups)
      return handleListGroups(req, res, Number(mpGroups[1]));
    const mpClubs = pathname.match(
      /^\/api\/public\/tournaments\/(\d+)\/clubs\/?$/
    );
    if (req.method === "GET" && mpClubs)
      return handleListClubs(req, res, Number(mpClubs[1]));
    const mpMatches = pathname.match(
      /^\/api\/public\/tournaments\/(\d+)\/matches\/?$/
    );
    if (req.method === "GET" && mpMatches)
      return handleListMatches(req, res, Number(mpMatches[1]));

    if (
      req.method === "GET" &&
      /^\/api\/public\/tournaments\/players\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListPlayers(req, res, id);
    }
    if (
      req.method === "GET" &&
      /^\/api\/public\/tournaments\/groups\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListGroups(req, res, id);
    }
    if (
      req.method === "GET" &&
      /^\/api\/public\/tournaments\/clubs\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListClubs(req, res, id);
    }
    if (
      req.method === "GET" &&
      /^\/api\/public\/tournaments\/matches\/?$/.test(pathname)
    ) {
      const id = Number(searchParams.get("id"));
      if (!Number.isFinite(id))
        return send(res, 400, { error: "invalid_tournament_id" });
      return handleListMatches(req, res, id);
    }

    // Fallback
    return send(res, 404, { error: "route_not_found", path: pathname });
  } catch (e) {
    try {
      return send(res, 500, {
        error: "server_error",
        message: e?.message || null,
        name: e?.name || null,
      });
    } catch {
      res.statusCode = 500;
      res.end('{"error":"server_error"}');
    }
  }
}

export const config = { runtime: "nodejs" };
