const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");
const {
  sign,
  verify,
  setSessionCookie,
  clearSessionCookie,
} = require("./auth/tokens");
const {
  requireViewerOrAdminForTournament,
  requireAdminForTournament,
} = require("./middlewares/auth");
require("dotenv").config();

const app = express();

// ---- Helpers ----
const dbg = (...args) => console.log(new Date().toISOString(), ...args);
const maskBody = (b) => {
  try {
    if (!b || typeof b !== "object") return b;
    const clone = { ...b };
    ["password", "adminPassword", "userPassword", "pass"].forEach((k) => {
      if (clone[k] != null) clone[k] = "***";
    });
    return clone;
  } catch (_) {
    return b;
  }
};

// ---- CORS ----
const RAW_ALLOWED =
  process.env.CORS_ORIGINS ||
  process.env.CORS_ORIGIN ||
  "http://localhost:3000";
const ALLOWED_ORIGINS = RAW_ALLOWED.split(",").map((s) => s.trim());
if (process.env.VERCEL_URL) {
  const vercelHost = `https://${process.env.VERCEL_URL}`;
  if (!ALLOWED_ORIGINS.includes(vercelHost)) ALLOWED_ORIGINS.push(vercelHost);
}
if (process.env.NEXT_PUBLIC_SITE_URL) {
  const site = process.env.NEXT_PUBLIC_SITE_URL.trim();
  if (site && !ALLOWED_ORIGINS.includes(site)) ALLOWED_ORIGINS.push(site);
}
const PROD_ORIGIN = "https://showdown-master-fr.vercel.app";
if (!ALLOWED_ORIGINS.includes(PROD_ORIGIN)) ALLOWED_ORIGINS.push(PROD_ORIGIN);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowAll = ALLOWED_ORIGINS.includes("*");
  const isAllowed = origin && (allowAll || ALLOWED_ORIGINS.includes(origin));

  if (isAllowed) res.header("Access-Control-Allow-Origin", origin);
  else res.header("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0] || "*");

  res.header("Vary", "Origin");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,PUT,DELETE,OPTIONS"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ---- Env sanity ----
const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "JWT_SECRET"];
const MISSING_ENV = REQUIRED_ENV.filter(
  (k) => !process.env[k] || String(process.env[k]).trim() === ""
);
if (MISSING_ENV.length) {
  console.warn("[BOOT] Missing env vars:", MISSING_ENV.join(", "));
}

// ---- Supabase (service role) ----
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(bodyParser.json());
app.use(cookieParser());
app.use((req, _res, next) => {
  if (process.env.DEBUG_HTTP === "true") {
    dbg(`[REQ] ${req.method} ${req.originalUrl}`, {
      params: req.params,
      query: req.query,
      body: maskBody(req.body),
    });
  }
  next();
});

app.get("/", (req, res) => {
  res.send("SMTP verification API is running. Try POST /api/send-email-code");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---- DEBUG endpoints (utile sur Vercel) ----
app.get("/api/debug/env", (req, res) => {
  res.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV,
    vercel: Boolean(process.env.VERCEL),
    flags: {
      hasSUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      hasSERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY),
      hasJWT_SECRET: Boolean(process.env.JWT_SECRET),
    },
    allowedOrigins: ALLOWED_ORIGINS,
  });
});

app.get("/api/debug/health", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tournament")
      .select("id")
      .limit(3);
    res.json({
      ok: true,
      supabaseOk: !error,
      count: data?.length || 0,
      sample: (data || []).map((r) => r.id),
      error: error?.message || null,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// =========================
// AUTH
// =========================
async function adminLoginHandler(req, res) {
  try {
    dbg("→ [POST] /auth/admin/login called", { body: maskBody(req.body) });

    const { tournamentId, password } = req.body || {};
    const idNum = Number(tournamentId);
    const pwd = typeof password === "string" ? password.trim() : "";
    if (!Number.isFinite(idNum) || idNum <= 0 || pwd.length === 0) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const { data: t, error } = await supabase
      .from("tournament")
      .select("id, admin_password_hash, user_password_hash")
      .eq("id", idNum)
      .single();

    if (error || !t) return res.status(404).json({ error: "not_found" });

    const bcrypt = require("bcryptjs");
    let candidate = t.admin_password_hash || t.user_password_hash || null;
    if (!candidate)
      return res.status(401).json({ error: "Invalid credentials" });

    const looksLikeBcrypt =
      typeof candidate === "string" && candidate.startsWith("$2");
    if (!looksLikeBcrypt) {
      if (pwd !== String(candidate)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const upgraded = await bcrypt.hash(pwd, 10);
      await supabase
        .from("tournament")
        .update({ admin_password_hash: upgraded })
        .eq("id", idNum);
      candidate = upgraded;
    }

    const ok = await bcrypt.compare(pwd, candidate);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = sign({ scope: "admin", tournament_id: idNum });
    setSessionCookie(res, token, 12 * 60 * 60 * 1000);
    return res.json({ ok: true });
  } catch (e) {
    console.error("adminLoginHandler error:", e);
    return res.status(500).json({ error: "server_error" });
  }
}
app.post("/auth/admin/login", adminLoginHandler);
app.post("/api/auth/admin/login", adminLoginHandler);

function adminLoginGetHandler(_req, res) {
  res.status(405).json({
    error: "Method Not Allowed",
    hint: "Use POST /auth/admin/login with JSON { tournamentId, password }.",
  });
}
app.get("/auth/admin/login", adminLoginGetHandler);
app.get("/api/auth/admin/login", adminLoginGetHandler);

async function tournamentViewerLoginHandler(req, res) {
  try {
    dbg("→ [POST] /auth/tournament/login called", { body: maskBody(req.body) });
    const { tournamentId, password } = req.body || {};
    const idNum = Number(tournamentId);
    const pwd = typeof password === "string" ? password.trim() : "";
    if (!Number.isFinite(idNum) || idNum <= 0 || pwd.length === 0) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const { data: t, error } = await supabase
      .from("tournament")
      .select("id, user_password_hash, is_private")
      .eq("id", idNum)
      .single();

    if (error || !t) return res.status(404).json({ error: "not_found" });
    if (t.is_private !== true)
      return res.status(400).json({ error: "tournament_public" });

    const bcrypt = require("bcryptjs");
    const ok = await bcrypt.compare(pwd, t.user_password_hash || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = sign({ scope: "viewer", tournament_id: idNum });
    setSessionCookie(res, token, 12 * 60 * 60 * 1000);
    return res.json({ ok: true });
  } catch (e) {
    console.error("tournamentViewerLoginHandler error:", e);
    return res.status(500).json({ error: "server_error" });
  }
}
app.post("/auth/tournament/login", tournamentViewerLoginHandler);
app.post("/api/auth/tournament/login", tournamentViewerLoginHandler);

function logoutHandler(_req, res) {
  dbg("→ [POST] /auth/logout called");
  clearSessionCookie(res);
  res.json({ ok: true });
}
app.post("/auth/logout", logoutHandler);
app.post("/api/auth/logout", logoutHandler);

function meHandler(req, res) {
  try {
    dbg("→ [GET] /auth/me called");
    res.set("Cache-Control", "no-store");
    const name = process.env.COOKIE_NAME || "sm_session";
    const token = req.cookies?.[name];
    if (!token) return res.json({ ok: false });
    const payload = verify(token);
    return res.json({
      ok: true,
      scope: payload.scope,
      tournamentId: payload.tournament_id,
    });
  } catch {
    return res.json({ ok: false });
  }
}
app.get("/auth/me", meHandler);
app.get("/api/auth/me", meHandler);

// ---- Mailer (skip verify in prod to avoid serverless crash) ----
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

if (process.env.NODE_ENV !== "production") {
  transporter
    .verify()
    .then(() => console.log("SMTP transport verified ✅"))
    .catch((err) =>
      console.error("SMTP transport verify failed ❌", {
        message: err?.message,
        code: err?.code,
        response: err?.response,
        responseCode: err?.responseCode,
      })
    );
}

// ---- Email code ----
app.post("/api/send-email-code", async (req, res) => {
  dbg("→ [POST] /api/send-email-code called", { body: maskBody(req.body) });
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Missing email" });

  const code = sixDigit();
  const salt = crypto.randomUUID();
  const codeHash = sha256(`${code}:${salt}`);
  const requestId = crypto.randomUUID();
  const expires = Date.now() + 10 * 60 * 1000; // 10 min

  store.set(requestId, { email, codeHash, salt, expires, attempts: 0 });

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Verification code for ${email}:`, code);
    }

    const info = await transporter.sendMail({
      from:
        process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com",
      to: email,
      subject: "Code de vérification",
      text: `Votre code de vérification est : ${code}`,
    });

    console.log("Email sent:", info?.messageId || info);

    const payload = { requestId };
    if (process.env.NODE_ENV !== "production") payload.devCode = code;
    res.json(payload);
  } catch (err) {
    console.error("sendMail failed", {
      message: err?.message,
      code: err?.code,
      command: err?.command,
      response: err?.response,
      responseCode: err?.responseCode,
    });
    const msg =
      process.env.NODE_ENV !== "production"
        ? err?.message || "send_failed"
        : "send_failed";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/verify-email-code", (req, res) => {
  dbg("→ [POST] /api/verify-email-code called", { body: maskBody(req.body) });
  const { requestId, code } = req.body || {};
  if (!requestId || !code)
    return res.status(400).json({ error: "Missing fields" });

  const row = store.get(requestId);
  if (!row)
    return res
      .status(404)
      .json({ verified: false, error: "request_not_found" });
  if (Date.now() > row.expires)
    return res.status(400).json({ verified: false, error: "expired" });
  if (row.attempts >= MAX_ATTEMPTS)
    return res
      .status(429)
      .json({ verified: false, error: "too_many_attempts" });

  const ok = sha256(`${code}:${row.salt}`) === row.codeHash;
  store.set(requestId, { ...row, attempts: row.attempts + 1 });
  if (ok) store.delete(requestId);

  res.json({ verified: ok });
});

// =========================
// API: tournaments & mirrors
// =========================
app.get("/api/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments called", { query: req.query });
    const { past } = req.query;

    const { data, error } = await supabase
      .from("tournament")
      .select("id, title, startday, endday, is_private")
      .order("startday", { ascending: true });

    if (error) {
      console.error("[SUPABASE] /api/tournaments error:", error);
      return res
        .status(500)
        .json({ error: "supabase_error", hint: error.message });
    }

    let list = data || [];
    if (past !== undefined) {
      const isPast = String(past) === "1" || String(past) === "true";
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const ts = +today;
      list = list.filter((t) => {
        const end = Date.parse(t?.endday ?? "");
        if (!Number.isFinite(end)) return !isPast; // si end invalide, considère futur/présent
        return isPast ? end <= ts : end >= ts;
      });
    }

    return res.json(list);
  } catch (e) {
    console.error("/api/tournaments fatal error", e);
    return res
      .status(500)
      .json({ error: "server_error", hint: String(e?.message || e) });
  }
});

app.get("/api/tournaments/:id", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments/:id called", { params: req.params });
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "invalid_tournament_id" });
    }
    const { data, error } = await supabase
      .from("tournament")
      .select("id, title, startday, endday, is_private")
      .eq("id", idNum)
      .single();
    if (error) return res.status(404).json({ error: "not_found" });
    return res.json(data || null);
  } catch (e) {
    console.error("GET /api/tournaments/:id error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/public/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/public/tournaments called", { query: req.query });
    const { past } = req.query;
    const { data, error } = await supabase
      .from("tournament")
      .select("id, title, startday, endday, is_private")
      .order("startday", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = String(past) === "1" || String(past) === "true";

    const filtered = (data || []).filter((t) => {
      const end = new Date(t.endday);
      end.setHours(0, 0, 0, 0);
      return isPast ? end <= today : end >= today;
    });

    res.json(filtered);
  } catch (e) {
    console.error("/api/public/tournaments error", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/public/tournaments/:id", async (req, res) => {
  try {
    dbg("→ [GET] /api/public/tournaments/:id called", { params: req.params });
    const { id } = req.params;
    const { data, error } = await supabase
      .from("tournament")
      .select("id, title, startday, endday, is_private")
      .eq("id", id)
      .single();
    if (error) return res.status(404).json({ error: "not_found" });
    return res.json(data);
  } catch (e) {
    console.error("GET /api/public/tournaments/:id error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// ----- Players / Groups / Clubs / Referees / Matches (lectures) -----
app.get("/api/tournaments/:id/players", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments/:id/players called", { params: req.params });
    const { id } = req.params;
    const { data, error } = await supabase
      .from("player")
      .select(
        `id, firstname, lastname, tournament_id, group_id,
         club:club_id(id, name, abbreviation)`
      )
      .eq("tournament_id", id)
      .order("lastname", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/tournaments/:id/players", e);
    return res.status(500).json({ error: "server_error" });
  }
});

app.patch(
  "/api/tournaments/:id/players/:playerId",
  requireAdminForTournament,
  async (req, res) => {
    dbg("→ [PATCH] /api/tournaments/:id/players/:playerId called", {
      params: req.params,
      body: maskBody(req.body),
    });
    const { id, playerId } = req.params;
    const payload = req.body || {};
    const { data, error } = await supabase
      .from("player")
      .update(payload)
      .eq("id", playerId)
      .eq("tournament_id", id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  }
);

app.get("/api/tournaments/:id/groups", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments/:id/groups called", { params: req.params });
    const { id } = req.params;
    const { data, error } = await supabase
      .from("group")
      .select(
        "id, name, group_type, round_type, tournament_id, highest_position"
      )
      .eq("tournament_id", id)
      .order("name", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/tournaments/:id/groups", e);
    return res.status(500).json({ error: "server_error" });
  }
});

const listClubsByTournament = async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments/:id/clubs called", { params: req.params });
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "invalid_tournament_id" });
    }

    const { data, error } = await supabase
      .from("club")
      .select("id, name, abbreviation, tournament_id, created_at, updated_at")
      .eq("tournament_id", idNum)
      .order("name", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/tournaments/:id/clubs", e);
    return res.status(500).json({ error: "server_error" });
  }
};
app.get("/api/tournaments/:id/clubs", listClubsByTournament);
app.get("/api/tournaments/:id/club", listClubsByTournament);

app.get("/api/tournaments/:id/referees", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments/:id/referees called", { params: req.params });
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "invalid_tournament_id" });
    }

    const { data, error } = await supabase
      .from("referee")
      .select(
        `id, firstname, lastname, tournament_id, club_id, created_at, updated_at,
         club:club_id ( id, name, abbreviation )`
      )
      .eq("tournament_id", idNum)
      .order("lastname", { ascending: true })
      .order("firstname", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/tournaments/:id/referees", e);
    return res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/tournaments/:id/matches", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments/:id/matches called", { params: req.params });
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "invalid_tournament_id" });
    }

    const { data, error } = await supabase
      .from("match")
      .select(
        `
        id,
        tournament_id,
        group_id,
        match_day,
        match_time,
        table_number,
        player1:player1_id ( id, firstname, lastname, club_id ),
        player2:player2_id ( id, firstname, lastname, club_id ),
        group:group_id ( id, name, group_type, group_former, highest_position ),
        referee_1:referee1_id ( id, firstname, lastname ),
        referee_2:referee2_id ( id, firstname, lastname ),
        player1_group_position,
        player2_group_position,
        result
      `
      )
      .eq("tournament_id", idNum)
      .order("match_day", { ascending: true })
      .order("match_time", { ascending: true })
      .order("table_number", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/tournaments/:id/matches", e);
    return res.status(500).json({ error: "server_error" });
  }
});

app.patch(
  "/api/tournaments/:id/matches/:matchId",
  requireAdminForTournament,
  async (req, res) => {
    dbg("→ [PATCH] /api/tournaments/:id/matches/:matchId called", {
      params: req.params,
      body: maskBody(req.body),
    });
    const { id, matchId } = req.params;
    const payload = req.body || {};
    const { data, error } = await supabase
      .from("match")
      .update(payload)
      .eq("id", matchId)
      .eq("tournament_id", id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  }
);

// ---- Simple ping ----
app.get("/api", (_req, res) => {
  res.json({ ok: true, service: "showdown-master api" });
});

// ---- In-memory store (dev) ----
const store = new Map();
const sixDigit = () => Math.floor(100000 + Math.random() * 900000).toString();
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const MAX_ATTEMPTS = 5;

// ---- Export / run ----
module.exports = app;
module.exports.default = app;

if (require.main === module && !process.env.VERCEL) {
  const port = process.env.PORT || 3001;
  const host = process.env.HOST || "0.0.0.0";
  app.listen(port, host, () => {
    console.log(`SMTP verification API running on ${host}:${port}`);
    console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}
