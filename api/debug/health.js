// api/debug/health.js — teste (optionnel) l'accès Supabase REST, sinon renvoie juste les flags
async function sFetch(origin, path, headers) {
  const r = await fetch(`${origin.replace(/\/+$/, "")}${path}`, { headers });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

export default async function handler(_req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || "";
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

    // Si pas d'env, renvoyer un état "de base" sans planter
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(200).json({
        ok: true,
        supabaseOk: false,
        reason: "missing_env",
        flags: {
          hasSUPABASE_URL: Boolean(SUPABASE_URL),
          hasSERVICE_KEY: Boolean(SERVICE_KEY),
        },
      });
    }

    // Petit select minimaliste
    const { ok, status, text } = await sFetch(
      SUPABASE_URL,
      `/rest/v1/tournament?select=id&limit=3`,
      { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    );

    let sample = null;
    try {
      sample = JSON.parse(text);
    } catch {
      sample = null;
    }

    return res.status(ok ? 200 : status).json({
      ok,
      supabaseOk: ok,
      status,
      count: Array.isArray(sample) ? sample.length : null,
      sample: Array.isArray(sample) ? sample.map((r) => r.id) : null,
      raw: ok ? undefined : text, // utile en debug si erreur
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "server_error" });
  }
}
