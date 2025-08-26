import nodemailer from "nodemailer";
import crypto from "crypto";

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
const sign = (payload, secret) => {
  const body = b64(payload);
  const sig = hmac(body, secret);
  return `${body}.${sig}`;
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).end();
  }

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Missing email" });

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
      console.log("Email sent:", info?.messageId || info);
      console.log(`[DEV] Code for ${email}: ${code}`);
    }

    const payload = { requestId };
    if (process.env.NODE_ENV !== "production") payload.devCode = code;
    return res.status(200).json(payload);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "send_failed" });
  }
}
