// api/tournaments/debug.js — debug REST direct (aucune dépendance)
export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    const flags = {
      hasSUPABASE_URL: !!SUPABASE_URL,
      hasSERVICE_KEY: !!SERVICE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    };

    if (!SUPABASE_URL || !SERVICE_KEY) {
      res.status(500).json({ ok: false, error: "supabase_env_missing", flags });
      return;
    }

    const out = { ok: true, flags, requests: {} };

    // Test table 'tournament'
    const r1 = await fetch(
      `${SUPABASE_URL}/rest/v1/tournament?select=id&limit=3`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    if (!r1.ok) {
      out.requests.tournament = {
        status: r1.status,
        statusText: r1.statusText,
        error: await safeText(r1),
      };
    } else {
      const data = await r1.json();
      out.requests.tournament = {
        status: r1.status,
        count: Array.isArray(data) ? data.length : 0,
        sample: Array.isArray(data) ? data : [],
      };
    }

    // Si vide, tester 'tournaments' (pluriel)
    if (!out.requests.tournament.count) {
      const r2 = await fetch(
        `${SUPABASE_URL}/rest/v1/tournaments?select=id&limit=3`,
        {
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
        }
      );
      if (!r2.ok) {
        out.requests.tournaments = {
          status: r2.status,
          statusText: r2.statusText,
          error: await safeText(r2),
        };
      } else {
        const data2 = await r2.json();
        out.requests.tournaments = {
          status: r2.status,
          count: Array.isArray(data2) ? data2.length : 0,
          sample: Array.isArray(data2) ? data2 : [],
        };
      }
    }

    res.setHeader("Content-Type", "application/json");
    res.status(200).end(JSON.stringify(out));
  } catch (e) {
    res
      .status(500)
      .end(JSON.stringify({ ok: false, error: e?.message || "server_error" }));
  }
}

async function safeText(res) {
  try {
    const t = await res.text();
    return t;
  } catch {
    return null;
  }
}
