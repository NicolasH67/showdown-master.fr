const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

const RAW_ALLOWED =
  process.env.CORS_ORIGINS ||
  process.env.CORS_ORIGIN ||
  "http://localhost:3000";
const ALLOWED_ORIGINS = RAW_ALLOWED.split(",").map((s) => s.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowAll = ALLOWED_ORIGINS.includes("*");
  const isAllowed = origin && (allowAll || ALLOWED_ORIGINS.includes(origin));

  if (isAllowed) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0] || "*");
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("SMTP verification API is running. Try POST /api/send-email-code");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

transporter
  .verify()
  .then(() => {
    console.log("SMTP transport verified ✅");
  })
  .catch((err) => {
    console.error("SMTP transport verify failed ❌", {
      message: err?.message,
      code: err?.code,
      response: err?.response,
      responseCode: err?.responseCode,
    });
  });

// stockage en mémoire (OK pour dev)
const store = new Map();
const sixDigit = () => Math.floor(100000 + Math.random() * 900000).toString();
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const MAX_ATTEMPTS = 5;

// Route : envoyer le code
app.post("/api/send-email-code", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Missing email" });

  const code = sixDigit();
  const salt = crypto.randomUUID();
  const codeHash = sha256(`${code}:${salt}`);
  const requestId = crypto.randomUUID();
  const expires = Date.now() + 10 * 60 * 1000; // 10 min

  store.set(requestId, { email, codeHash, salt, expires, attempts: 0 });

  try {
    // Log the code in dev to unblock tests without deliverability
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
    if (process.env.NODE_ENV !== "production") {
      payload.devCode = code;
    }
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

// Route : vérifier le code
app.post("/api/verify-email-code", (req, res) => {
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

// Lancer le serveur
const port = process.env.PORT || 3001;
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => {
  console.log(`SMTP verification API running on ${host}:${port}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});
