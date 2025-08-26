import crypto from "crypto";

// ----- CORS -----
const allowOrigin =
  process.env.CORS_ORIGINS || `https://${process.env.VERCEL_URL || ""}`;
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", allowOrigin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function parseToken(token, secret) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) throw new Error("bad_token");
  const exp = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  if (sig !== exp) throw new Error("bad_signature");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).end();
  }

  try {
    const { requestId, code } = await parseBody(req);
    if (!requestId || !code)
      return res.status(400).json({ error: "Missing fields" });

    const { email, codeHash, salt, expires } = parseToken(
      requestId,
      process.env.EMAIL_CODE_SECRET
    );
    if (Date.now() > Number(expires))
      return res.status(400).json({ verified: false, error: "expired" });

    const hash = crypto
      .createHash("sha256")
      .update(`${code}:${salt}`)
      .digest("hex");
    return res.status(200).json({ verified: hash === codeHash, email });
  } catch (e) {
    console.error("verify-email-code error:", e?.stack || e?.message || e);
    return res.status(400).json({ verified: false, error: "invalid_request" });
  }
}
