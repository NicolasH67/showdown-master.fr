// api/public/tournaments/index.js — self-contained public list (no Express)
export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      res.status(500).json({ error: "supabase_env_missing" });
      return;
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const base = SUPABASE_URL.replace(/\/+$/, "");
    const r = await fetch(
      `${base}/rest/v1/tournament?select=id,title,startday,endday,is_private&order=startday.asc`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    const text = await r.text();
    if (!r.ok) {
      res.status(r.status).end(text);
      return;
    }

    let data = [];
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }

    // Optional filter by `past`
    const url = new URL(req.url, `https://${req.headers.host}`);
    const past = url.searchParams.get("past");
    if (past !== null) {
      const isPast = past === "1" || past === "true";
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTs = today.getTime();
      data = data.filter((t) => {
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
        const isPastT = Number.isFinite(e) ? e < todayTs : false;
        return isPast ? isPastT : isCurrent || isFuture;
      });
    }

    res.setHeader("Content-Type", "application/json");
    res.status(200).end(JSON.stringify(data));
  } catch (e) {
    res.status(500).json({ error: e?.message || "server_error" });
  }
}
