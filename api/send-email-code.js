const nodemailer = require("nodemailer");
const crypto = require("crypto");

// ----- CORS -----
const allowOrigin =
  process.env.CORS_ORIGINS || `https://${process.env.VERCEL_URL || ""}`;
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", allowOrigin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ----- Token stateless (HMAC) -----
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const hmac = (s, secret) =>
  crypto.createHmac("sha256", secret).update(s).digest("base64url");
const sign = (payload, secret) =>
  `${b64(payload)}.${hmac(b64(payload), secret)}`;

// Important: créer le transporter dans le handler pour éviter des erreurs au cold start si env manquantes
module.exports = async function (req, res) {
  try {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST,OPTIONS");
      return res.status(405).end();
    }

    // Parse JSON body
    let body = req.body;
    if (!body || typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch {
        body = {};
      }
    }
    const { email } = body || {};
    if (!email) return res.status(400).json({ error: "Missing email" });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = crypto.randomUUID();
    const codeHash = crypto
      .createHash("sha256")
      .update(`${code}:${salt}`)
      .digest("hex");
    const expires = Date.now() + 10 * 60 * 1000; // 10 min
    const requestId = sign(
      { email, codeHash, salt, expires },
      process.env.EMAIL_CODE_SECRET
    );

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Code de vérification",
      text: `Votre code de vérification est : ${code}`,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        "Email sent:",
        info && (info.messageId || info.response || info)
      );
      console.log(`[DEV] Code for ${email}: ${code}`);
    }

    const payload = { requestId };
    if (process.env.NODE_ENV !== "production") payload.devCode = code;
    return res.status(200).json(payload);
  } catch (e) {
    console.error("send-email-code error:", e && (e.stack || e.message || e));
    return res.status(500).json({ error: "send_failed" });
  }
};
