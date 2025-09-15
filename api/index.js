// Tournaments list
app.get("/api/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments called");
    const { data, error } = await supabase
      .from("tournament")
      .select("*")
      .order("id", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/tournaments", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// Public: tournaments list
app.get("/api/public/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/public/tournaments called");
    const { data, error } = await supabase
      .from("tournament")
      .select("*")
      .order("id", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e) {
    console.error("GET /api/public/tournaments", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// Tournament detail
app.get("/api/tournaments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    dbg("→ [GET] /api/tournaments/:id called", { id });
    const idNum = Number(id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "invalid_tournament_id" });
    }
    const { data, error } = await supabase
      .from("tournament")
      .select("*")
      .eq("id", idNum)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || null);
  } catch (e) {
    console.error("GET /api/tournaments/:id", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// Public: tournament detail
app.get("/api/public/tournaments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    dbg("→ [GET] /api/public/tournaments/:id called", { id });
    const idNum = Number(id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "invalid_tournament_id" });
    }
    const { data, error } = await supabase
      .from("tournament")
      .select("*")
      .eq("id", idNum)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || null);
  } catch (e) {
    console.error("GET /api/public/tournaments/:id", e);
    return res.status(500).json({ error: "server_error" });
  }
});
