// api/index.js — routeur unique pour Vercel (sans Express)
// Couvre :
// - /api/tournaments (+ /:id, /:id/players|groups|clubs|referees|matches, PATCH players/matches, POST create)
// - /api/public/tournaments (+ /:id et sous-ressources)
// - /api/auth/admin/login, /api/auth/tournament/login, /api/auth/logout, /api/auth/me
// - /api/send-email-code, /api/verify-email-code (gracieux si SMTP non configuré)

//
// --------- Utils bas niveau ---------
//
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
function hmacSHA256(key, data) {
  const crypto = require("crypto");
  return crypto
    .createHmac("sha256", key)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function signJWT(payload, secret, expMs = 12 * 60 * 60 * 1000) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + Math.floor(expMs / 1000), ...payload };
  const part1 = b64urlJSON(header);
  const part2 = b64urlJSON(body);
  const sig = hmacSHA256(secret, `${part1}.${part2}`);
  return `${part1}.${part2}.${sig}`;
}
function verifyJWT(token, secret) {
  const [h, p, s] = String(token || "").split(".");
  if (!h || !p || !s) return null;
  const expected = hmacSHA256(secret, `${h}.${p}`);
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
async function sFetch(path, init) {
  const r = await fetch(`${supabaseBase()}${path}`, init);
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

function parseUrl(req) {
  return new URL(req.url, `https://${req.headers.host}`);
}

//
// --------- Handlers REST Supabase ---------
//
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
async function handleCreateTournament(req, res, body) {
  const payload = {
    title: body?.title,
    startday: body?.startday,
    endday: body?.endday,
    email: body?.email,
    table_count: body?.table_count ?? 4,
    match_duration: body?.match_duration ?? 30,
    location: body?.location ?? null,
    is_private: body?.is_private ?? true,
    admin_password_hash: body?.admin_password_hash ?? null,
    user_password_hash: body?.user_password_hash ?? null,
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

//
// --------- AUTH (JWT cookie maison) ---------
//
async function handleAdminLogin(req, res, body) {
  const bcrypt = require("bcryptjs");
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
  const arr = JSON.parse(text) || [];
  const t = arr[0];
  if (!t) return send(res, 404, { error: "not_found" });

  const candidate = t.admin_password_hash || t.user_password_hash || "";
  const passOk = candidate.startsWith("$2")
    ? await bcrypt.compare(pwd, candidate)
    : pwd === candidate;

  if (!passOk) return send(res, 401, { error: "Invalid credentials" });

  const token = signJWT({ scope: "admin", tournament_id: idNum }, SECRET);
  setCookie(res, COOKIE, token, 12 * 60 * 60 * 1000);
  return send(res, 200, { ok: true });
}
async function handleViewerLogin(req, res, body) {
  const bcrypt = require("bcryptjs");
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
  const arr = JSON.parse(text) || [];
  const t = arr[0];
  if (!t) return send(res, 404, { error: "not_found" });
  if (t.is_private !== true)
    return send(res, 400, { error: "tournament_public" });

  const passOk = await bcrypt.compare(pwd, t.user_password_hash || "");
  if (!passOk) return send(res, 401, { error: "Invalid credentials" });

  const token = signJWT({ scope: "viewer", tournament_id: idNum }, SECRET);
  setCookie(res, COOKIE, token, 12 * 60 * 60 * 1000);
  return send(res, 200, { ok: true });
}
function handleLogout(_req, res) {
  const COOKIE = process.env.COOKIE_NAME || "sm_session";
  clearCookie(res, COOKIE);
  return send(res, 200, { ok: true });
}
function handleMe(req, res) {
  const COOKIE = process.env.COOKIE_NAME || "sm_session";
  const SECRET = process.env.JWT_SECRET || "change-me";
  const cookie = String(req.headers.cookie || "");
  const m = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  const token = m ? m[1] : null;
  if (!token) return send(res, 200, { ok: false });
  const payload = verifyJWT(token, SECRET);
  if (!payload) return send(res, 200, { ok: false });
  return send(res, 200, {
    ok: true,
    scope: payload.scope,
    tournamentId: payload.tournament_id,
  });
}

//
// --------- Email code (gracieux) ---------
//
const volatileStore = new Map();
function sixDigit() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function sha256(s) {
  return require("crypto").createHash("sha256").update(s).digest("hex");
}

async function handleSendEmailCode(req, res, body) {
  const email = String(body?.email || "").trim();
  if (!email) return send(res, 400, { error: "Missing email" });

  const code = sixDigit();
  const salt = cryptoRandom();
  const codeHash = sha256(`${code}:${salt}`);
  const requestId = cryptoRandom();
  const expires = Date.now() + 10 * 60 * 1000;
  volatileStore.set(requestId, { email, codeHash, salt, expires, attempts: 0 });

  // En dev, renvoie le code pour faciliter les tests
  const devPayload =
    process.env.NODE_ENV !== "production" ? { devCode: code } : {};
  // En prod, envoie l'email SI SMTP configuré, sinon renvoie ok sans crash
  const hasSMTP = process.env.SMTP_HOST && process.env.SMTP_USER;
  if (hasSMTP) {
    try {
      const nodemailer = require("nodemailer");
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
    } catch (e) {
      // Ne plante pas l'API
    }
  }
  return send(res, 200, { ok: true, requestId, ...devPayload });
}
function cryptoRandom() {
  return require("crypto").randomUUID();
}

function handleVerifyEmailCode(req, res, body) {
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

  const ok = sha256(`${code}:${row.salt}`) === row.codeHash;
  volatileStore.set(requestId, { ...row, attempts: row.attempts + 1 });
  if (ok) volatileStore.delete(requestId);
  return send(res, 200, { verified: ok });
}

//
// --------- Router central ---------
//
export default async function handler(req, res) {
  try {
    // Sanity env check pour éviter 500 opaques
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return send(res, 500, { error: "supabase_env_missing" });
    }

    const { pathname, searchParams } = parseUrl(req);

    // ---- AUTH
    if (req.method === "POST" && pathname === "/api/auth/admin/login") {
      const body = await readJson(req);
      return handleAdminLogin(req, res, body);
    }
    if (req.method === "POST" && pathname === "/api/auth/tournament/login") {
      const body = await readJson(req);
      return handleViewerLogin(req, res, body);
    }
    if (req.method === "POST" && pathname === "/api/auth/logout") {
      return handleLogout(req, res);
    }
    if (req.method === "GET" && pathname === "/api/auth/me") {
      return handleMe(req, res);
    }

    // ---- EMAIL CODE
    if (req.method === "POST" && pathname === "/api/send-email-code") {
      const body = await readJson(req);
      return handleSendEmailCode(req, res, body);
    }
    if (req.method === "POST" && pathname === "/api/verify-email-code") {
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
    const mT = pathname.match(/^\/api\/tournaments\/(\d+)\/?$/);
    if (req.method === "GET" && mT) {
      return handleGetTournament(req, res, Number(mT[1]));
    }

    // sous-ressources
    const mPlayers = pathname.match(/^\/api\/tournaments\/(\d+)\/players\/?$/);
    if (req.method === "GET" && mPlayers)
      return handleListPlayers(req, res, Number(mPlayers[1]));
    const mPatchPlayer = pathname.match(
      /^\/api\/tournaments\/(\d+)\/players\/(\d+)\/?$/
    );
    if (req.method === "PATCH" && mPatchPlayer) {
      const body = await readJson(req);
      return handlePatchPlayer(req, res, Number(mPatchPlayer[2]), body);
    }

    const mGroups = pathname.match(/^\/api\/tournaments\/(\d+)\/groups\/?$/);
    if (req.method === "GET" && mGroups)
      return handleListGroups(req, res, Number(mGroups[1]));

    const mClubs = pathname.match(/^\/api\/tournaments\/(\d+)\/clubs?\/?$/);
    if (req.method === "GET" && mClubs)
      return handleListClubs(req, res, Number(mClubs[1]));

    const mRefs = pathname.match(/^\/api\/tournaments\/(\d+)\/referees?\/?$/);
    if (req.method === "GET" && mRefs)
      return handleListReferees(req, res, Number(mRefs[1]));

    const mMatches = pathname.match(/^\/api\/tournaments\/(\d+)\/matches\/?$/);
    if (req.method === "GET" && mMatches)
      return handleListMatches(req, res, Number(mMatches[1]));
    const mPatchMatch = pathname.match(
      /^\/api\/tournaments\/(\d+)\/matches\/(\d+)\/?$/
    );
    if (req.method === "PATCH" && mPatchMatch) {
      const body = await readJson(req);
      return handlePatchMatch(req, res, Number(mPatchMatch[2]), body);
    }

    // ---- PUBLIC mirroir (pour compat historique — même data)
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

    // Fallback
    return send(res, 404, { error: "route_not_found", path: pathname });
  } catch (e) {
    return send(res, 500, { error: e?.message || "server_error" });
  }
}
