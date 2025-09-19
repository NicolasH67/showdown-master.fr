// =========================
// PROTECTED API: list tournaments (no auth required in this app)
// GET /api/tournaments
app.get("/api/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments called", { query: req.query });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: "supabase_env_missing" });
    }

    let { data, error } = await supabase
      .from("tournament")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("/api/tournaments select tournament error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Fallback: alternate table name if needed
    if (!data || (Array.isArray(data) && data.length === 0)) {
      const alt = await supabase
        .from("tournaments")
        .select("*")
        .order("id", { ascending: true });
      if (!alt.error && alt.data && alt.data.length) {
        data = alt.data;
      }
    }

    console.log(
      "[GET] /api/tournaments count=",
      Array.isArray(data) ? data.length : 0
    );
    return res.json(data || []);
  } catch (e) {
    console.error("/api/tournaments error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// TEMP diagnostic endpoint — helps verify prod DB connectivity on Vercel
// GET /api/tournaments/debug
app.get("/api/tournaments/debug", async (_req, res) => {
  try {
    const flags = {
      hasSUPABASE_URL: !!process.env.SUPABASE_URL,
      hasSERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    };
    const out = { flags };

    const t1 = await supabase.from("tournament").select("id").order("id");
    out.table_tournament = {
      error: t1.error ? t1.error.message : null,
      count: Array.isArray(t1.data) ? t1.data.length : 0,
      sample: Array.isArray(t1.data) ? t1.data.slice(0, 3) : [],
    };

    if (!out.table_tournament.count) {
      const t2 = await supabase.from("tournaments").select("id").order("id");
      out.table_tournaments = {
        error: t2.error ? t2.error.message : null,
        count: Array.isArray(t2.data) ? t2.data.length : 0,
        sample: Array.isArray(t2.data) ? t2.data.slice(0, 3) : [],
      };
    }

    return res.json(out);
  } catch (e) {
    return res.status(500).json({ error: "server_error" });
  }
});

// =========================
// PUBLIC API: get one tournament (no secrets)

// api/tournaments/debug.js — self-contained debug (no Express)
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    const flags = {
      hasSUPABASE_URL: !!SUPABASE_URL,
      hasSERVICE_KEY: !!SUPABASE_SERVICE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      res.status(500).json({ ok: false, error: "supabase_env_missing", flags });
      return;
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const t1 = await sb.from("tournament").select("id").order("id");
    const out = {
      ok: true,
      flags,
      table_tournament: {
        error: t1.error ? t1.error.message : null,
        count: Array.isArray(t1.data) ? t1.data.length : 0,
        sample: Array.isArray(t1.data) ? t1.data.slice(0, 3) : [],
      },
    };

    if (!out.table_tournament.count) {
      const t2 = await sb.from("tournaments").select("id").order("id");
      out.table_tournaments = {
        error: t2.error ? t2.error.message : null,
        count: Array.isArray(t2.data) ? t2.data.length : 0,
        sample: Array.isArray(t2.data) ? t2.data.slice(0, 3) : [],
      };
    }

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "server_error" });
  }
}
