// api/tournaments/index.js — handler unifié sans Express
// Regroupe les principales routes du backend (tournaments, players, groups, clubs, matches, referees)
// en interrogeant directement Supabase REST. Compatible Vercel Serverless.

async function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
  });
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function missingEnv(res) {
  json(res, 500, { error: "supabase_env_missing" });
}

function headers(SERVICE_KEY) {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
}

function baseUrl() {
  const raw = process.env.SUPABASE_URL || "";
  return raw.replace(/\/+$/, "");
}

async function sFetch(path, init) {
  const r = await fetch(`${baseUrl()}${path}`, init);
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) return missingEnv(res);

    const url = new URL(req.url, `https://${req.headers.host}`);
    const { pathname, searchParams } = url;

    // --- ROUTING ---
    // /api/tournaments
    if (req.method === "GET" && /^\/api\/tournaments\/?$/.test(pathname)) {
      const { ok, status, text } = await sFetch(
        `/rest/v1/tournament?select=id,title,startday,endday,is_private&order=startday.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) return res.status(status).end(text);
      let data = [];
      try { data = JSON.parse(text); } catch { data = []; }

      const past = searchParams.get("past");
      if (past !== null) {
        const isPast = past === "1" || past === "true";
        const today = new Date(); today.setHours(0,0,0,0);
        const ts = today.getTime();
        data = data.filter((t) => {
          const s = t?.startday ? Date.parse(t.startday) : NaN;
          const e = t?.endday ? Date.parse(t.endday) : NaN;
          const current = (Number.isFinite(s) ? s <= ts : true) && (Number.isFinite(e) ? ts <= e : true);
          const future = Number.isFinite(s) ? s > ts : (Number.isFinite(e) ? e > ts : true);
          const pastT  = Number.isFinite(e) ? e < ts : false;
          return isPast ? pastT : (current || future);
        });
      }
      return json(res, 200, data);
    }

    // POST /api/tournaments
    if (req.method === "POST" && /^\/api\/tournaments\/?$/.test(pathname)) {
      const body = await readJson(req);
      const payload = {
        title: body?.title,
        startday: body?.startday,
        endday: body?.endday,
        email: body?.email,
        table_count: body?.table_count ?? 4,
        match_duration: body?.match_duration ?? 30,
        location: body?.location ?? null,
        is_private: body?.is_private ?? true,
        admin_password_hash: body?.admin_password_hash ?? null,
        user_password_hash: body?.user_password_hash ?? null,
      };
      const { ok, status, text } = await sFetch(
        `/rest/v1/tournament?select=id,title,startday,endday,is_private`,
        {
          method: "POST",
          headers: { ...headers(SERVICE_KEY), "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify(payload),
        }
      );
      res.statusCode = ok ? 201 : status;
      res.setHeader("Content-Type", "application/json");
      return res.end(text);
    }

    // GET /api/tournaments/:id
    const mId = pathname.match(/^\/api\/tournaments\/(\d+)\/?$/);
    if (req.method === "GET" && mId) {
      const id = Number(mId[1]);
      const { ok, status, text } = await sFetch(
        `/rest/v1/tournament?id=eq.${id}&select=id,title,startday,endday,is_private`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) return res.status(status).end(text);
      let arr = [];
      try { arr = JSON.parse(text); } catch { arr = []; }
      const obj = Array.isArray(arr) ? arr[0] : null;
      if (!obj) return json(res, 404, { error: "not_found" });
      return json(res, 200, obj);
    }

    // GET /api/tournaments/:id/players
    const mPlayers = pathname.match(/^\/api\/tournaments\/(\d+)\/players\/?$/);
    if (req.method === "GET" && mPlayers) {
      const id = Number(mPlayers[1]);
      const { ok, status, text } = await sFetch(
        `/rest/v1/player?tournament_id=eq.${id}&select=id,firstname,lastname,tournament_id,group_id,club:club_id(id,name,abbreviation)&order=lastname.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) return res.status(status).end(text);
      let data = [];
      try { data = JSON.parse(text); } catch {