app.get("/api/public/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/public/tournaments called", { query: req.query });
    const { past } = req.query;
    const { data, error } = await supabase
      .from("tournament")
      .select("id, title, startday, endday, is_private")
      .order("startday", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    let out = Array.isArray(data) ? data : [];
    const wantFilter =
      past === "0" || past === "1" || past === "true" || past === "false";

    if (wantFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTs = today.getTime();
      const isPast = past === "1" || past === "true";

      const filtered = out.filter((t) => {
        const s = t?.startday ? Date.parse(t.startday) : NaN;
        const e = t?.endday ? Date.parse(t.endday) : NaN;
        const isCurrent =
          (Number.isFinite(s) ? s <= todayTs : true) &&
          (Number.isFinite(e) ? todayTs <= e : true);
        const isFuture = Number.isFinite(s)
          ? s > todayTs
          : Number.isFinite(e)
          ? e > todayTs
          : true;
        const isPastTournament = Number.isFinite(e) ? e < todayTs : false;
        return isPast ? isPastTournament : isCurrent || isFuture;
      });

      out = filtered.length ? filtered : out; // fallback to all if empty
    }

    console.log("[GET] /api/public/tournaments", {
      past,
      count: out.length,
    });
    res.json(out);
  } catch (e) {
    console.error("/api/public/tournaments error", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/tournaments", async (req, res) => {
  try {
    dbg("→ [GET] /api/tournaments called", { query: req.query });
    const { past } = req.query;
    const { data, error } = await supabase
      .from("tournament")
      .select("id, title, startday, endday, is_private")
      .order("startday", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    let out = Array.isArray(data) ? data : [];
    const wantFilter =
      past === "0" || past === "1" || past === "true" || past === "false";

    if (wantFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTs = today.getTime();
      const isPast = past === "1" || past === "true";

      const filtered = out.filter((t) => {
        const s = t?.startday ? Date.parse(t.startday) : NaN;
        const e = t?.endday ? Date.parse(t.endday) : NaN;
        const isCurrent =
          (Number.isFinite(s) ? s <= todayTs : true) &&
          (Number.isFinite(e) ? todayTs <= e : true);
        const isFuture = Number.isFinite(s)
          ? s > todayTs
          : Number.isFinite(e)
          ? e > todayTs
          : true;
        const isPastTournament = Number.isFinite(e) ? e < todayTs : false;
        return isPast ? isPastTournament : isCurrent || isFuture;
      });

      out = filtered.length ? filtered : out;
    }

    console.log("[GET] /api/tournaments", { count: out.length });
    return res.json(out);
  } catch (e) {
    console.error("/api/tournaments error", e);
    return res.status(500).json({ error: "server_error" });
  }
});
