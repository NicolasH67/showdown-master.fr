// Tournaments list (protected)
app.get("/api/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments called", {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      HAS_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      query: req.query,
    });

    const project = supabase; // health of client
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: "supabase_env_missing" });
    }

    // Optional filter: past=0 to fetch only upcoming/current tournaments; implement simple filter on a `start_date` column if present
    const past = req.query.past; // "0" or "1"

    let { data, error } = await supabase
      .from("tournament")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("/api/tournaments select tournament error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Fallback if table name differs in prod (e.g., "tournaments")
    if (!data || (Array.isArray(data) && data.length === 0)) {
      const alt = await supabase
        .from("tournaments")
        .select("*")
        .order("id", { ascending: true });
      if (!alt.error && alt.data && alt.data.length) {
        data = alt.data;
      }
    }

    // If past filter requested and column exists, filter here defensively
    if (Array.isArray(data) && past !== undefined) {
      const isPast = String(past) === "1";
      data = data.filter((t) => {
        const d = t?.start_date || t?.date || t?.created_at;
        const ts = d ? Date.parse(d) : NaN;
        if (!Number.isFinite(ts)) return true; // if no date, keep
        const now = Date.now();
        return isPast ? ts < now : ts >= now;
      });
    }

    console.log(
      `[api/tournaments] rows=`,
      Array.isArray(data) ? data.length : 0
    );
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/tournaments exception", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// Public: tournaments list
app.get("/api/public/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/public/tournaments called", {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      HAS_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      query: req.query,
    });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: "supabase_env_missing" });
    }

    const past = req.query.past;

    let { data, error } = await supabase
      .from("tournament")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("/api/public/tournaments select tournament error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      const alt = await supabase
        .from("tournaments")
        .select("*")
        .order("id", { ascending: true });
      if (!alt.error && alt.data && alt.data.length) {
        data = alt.data;
      }
    }

    if (Array.isArray(data) && past !== undefined) {
      const isPast = String(past) === "1";
      data = data.filter((t) => {
        const d = t?.start_date || t?.date || t?.created_at;
        const ts = d ? Date.parse(d) : NaN;
        if (!Number.isFinite(ts)) return true;
        const now = Date.now();
        return isPast ? ts < now : ts >= now;
      });
    }

    console.log(
      `[api/public/tournaments] rows=`,
      Array.isArray(data) ? data.length : 0
    );
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/public/tournaments exception", e);
    return res.status(500).json({ error: "server_error" });
  }
});
