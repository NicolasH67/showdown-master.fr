// =========================
// API: tournaments list & detail (same shape as public)
// GET /api/tournaments — list all tournaments
app.get("/api/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments called", { query: req.query });
    const { data, error } = await supabase
      .from("tournament")
      .select("id, title, startday, endday, is_private")
      .order("id", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/tournaments error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/tournaments/:id — tournament detail
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

// =========================
// PUBLIC API: list tournaments (no secrets)
