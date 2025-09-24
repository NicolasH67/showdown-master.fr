// api/tournaments/index.js — self-contained (no Express)
export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      res.status(500).json({ error: "supabase_env_missing" });
      return;
    }

    const base = SUPABASE_URL.replace(/\/+$/, ""); // retire le slash final

    if (req.method === "GET") {
      const r = await fetch(
        `${base}/rest/v1/tournament?select=id,title,startday,endday,is_private&order=id.asc`,
        {
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
        }
      );
      const text = await r.text();
      // Tente de parser le JSON, sinon renvoie tel quel avec le code status d'origine
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        /* ignore */
      }

      res.setHeader("Content-Type", "application/json");
      if (r.ok) {
        res.status(200).end(JSON.stringify(Array.isArray(data) ? data : []));
      } else {
        res.status(r.status).end(text);
      }
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const payload = {
        title: body?.title,
        startday: body?.startday,
        endday: body?.endday,
        email: body?.email,
        table_count: body?.table_count ?? 4,
        match_duration: body?.match_duration ?? 30,
        location: body?.location ?? null,
        is_private: true,
        admin_password_hash: body?.admin_password_hash ?? null,
        user_password_hash: body?.user_password_hash ?? null,
      };

      const r = await fetch(
        `${base}/rest/v1/tournament?select=id,title,startday,endday,is_private`,
        {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(payload),
        }
      );

      const text = await r.text();
      res.setHeader("Content-Type", "application/json");
      res.status(r.ok ? 201 : r.status).end(text);
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    res.status(500).json({ error: e?.message || "server_error" });
  }
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}
