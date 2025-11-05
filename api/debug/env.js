// api/debug/env.js — ultra léger, ne touche à aucun module externe
export default function handler(req, res) {
  try {
    res.status(200).json({
      ok: true,
      nodeEnv: process.env.NODE_ENV || null,
      vercel: Boolean(process.env.VERCEL),
      runtime: process.version,
      flags: {
        hasSUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        hasSERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY),
        hasJWT_SECRET: Boolean(process.env.JWT_SECRET),
        hasSMTP_HOST: Boolean(process.env.SMTP_HOST),
        hasSMTP_USER: Boolean(process.env.SMTP_USER),
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "server_error" });
  }
}
