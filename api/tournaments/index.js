// api/tournaments/index.js — handler unifié sans Express
// Regroupe les principales routes du backend (tournaments, players, groups, clubs, matches, referees)
// en interrogeant directement Supabase REST. Compatible Vercel Serverless.

const isOptions = (req) => req.method === "OPTIONS";
function setNoCache(res) {
  res.setHeader("Cache-Control", "no-store");
}

async function readJson(req) {
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

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  setNoCache(res);
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
  console.log("[api/tournaments]", req.method, req.url);
  if (isOptions(req)) {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,PUT,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.end();
  }
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) return missingEnv(res);

    const url = new URL(req.url, `https://${req.headers.host}`);
    const { pathname, searchParams } = url;

    // --- ROUTING ---
    // --- COLLECTION-LEVEL SHORTCUTS WITH QUERY PARAM ---
    // GET /api/tournaments/players?id=123
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/players\/?$/.test(pathname)
    ) {
      const idStr =
        searchParams.get("id") ||
        searchParams.get("t") ||
        searchParams.get("tid");
      const id = Number(idStr);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/player?tournament_id=eq.${id}` +
          `&select=id,firstname,lastname,tournament_id,group_id,club:club_id(id,name,abbreviation)` +
          `&order=lastname.asc&order=firstname.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // GET /api/tournaments/groups?id=123
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/groups\/?$/.test(pathname)
    ) {
      const idStr =
        searchParams.get("id") ||
        searchParams.get("t") ||
        searchParams.get("tid");
      const id = Number(idStr);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/group?tournament_id=eq.${id}&select=id,name,group_type,round_type,tournament_id,highest_position&order=name.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // GET /api/tournaments/matches?id=123
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/matches\/?$/.test(pathname)
    ) {
      const idStr =
        searchParams.get("id") ||
        searchParams.get("t") ||
        searchParams.get("tid");
      const id = Number(idStr);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/match?tournament_id=eq.${id}&select=id,tournament_id,group_id,match_day,match_time,table_number,player1:player1_id(id,firstname,lastname,club_id),player2:player2_id(id,firstname,lastname,club_id),group:group_id(id,name,group_type,group_former,highest_position),referee_1:referee1_id(id,firstname,lastname),referee_2:referee2_id(id,firstname,lastname),player1_group_position,player2_group_position,result&order=match_day.asc&order=match_time.asc&order=table_number.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // GET /api/tournaments/clubs?id=123
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/clubs\/?$/.test(pathname)
    ) {
      const idStr =
        searchParams.get("id") ||
        searchParams.get("t") ||
        searchParams.get("tid");
      const id = Number(idStr);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/club?tournament_id=eq.${id}&select=id,name,abbreviation,tournament_id,created_at,updated_at&order=name.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // GET /api/tournaments/referees?id=123
    if (
      req.method === "GET" &&
      /^\/api\/tournaments\/referees?\/?$/.test(pathname)
    ) {
      const idStr =
        searchParams.get("id") ||
        searchParams.get("t") ||
        searchParams.get("tid");
      const id = Number(idStr);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });

      const { ok, status, text } = await sFetch(
        `/rest/v1/referee?tournament_id=eq.${id}` +
          `&select=id,firstname,lastname,tournament_id,club_id,created_at,updated_at,` +
          `club:club_id(id,name,abbreviation)` +
          `&order=lastname.asc&order=firstname.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // /api/tournaments
    if (req.method === "GET" && /^\/api\/tournaments\/?$/.test(pathname)) {
      const { ok, status, text } = await sFetch(
        `/rest/v1/tournament?select=id,title,startday,endday,is_private&order=startday.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }

      const past = searchParams.get("past");
      if (past !== null) {
        const isPast = past === "1" || past === "true";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ts = today.getTime();
        data = data.filter((t) => {
          const s = t?.startday ? Date.parse(t.startday) : NaN;
          const e = t?.endday ? Date.parse(t.endday) : NaN;
          const current =
            (Number.isFinite(s) ? s <= ts : true) &&
            (Number.isFinite(e) ? ts <= e : true);
          const future = Number.isFinite(s)
            ? s > ts
            : Number.isFinite(e)
            ? e > ts
            : true;
          const pastT = Number.isFinite(e) ? e < ts : false;
          return isPast ? pastT : current || future;
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
          headers: {
            ...headers(SERVICE_KEY),
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
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
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/tournament?id=eq.${id}&select=id,title,startday,endday,is_private`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let arr = [];
      try {
        arr = JSON.parse(text);
      } catch {
        arr = [];
      }
      const obj = Array.isArray(arr) ? arr[0] : null;
      if (!obj) return json(res, 404, { error: "not_found" });
      return json(res, 200, obj);
    }

    // GET /api/tournaments/:id/players
    const mPlayers = pathname.match(/^\/api\/tournaments\/(\d+)\/players\/?$/);
    if (req.method === "GET" && mPlayers) {
      try {
        const id = Number(mPlayers[1]);
        if (!Number.isFinite(id) || id <= 0)
          return json(res, 400, { error: "invalid_tournament_id" });
        console.log("→ [GET] /api/tournaments/:id/players called", {
          params: { id },
        });

        const { ok, status, text } = await sFetch(
          `/rest/v1/player?tournament_id=eq.${id}` +
            `&select=id,firstname,lastname,tournament_id,group_id,club:club_id(id,name,abbreviation)` +
            `&order=lastname.asc&order=firstname.asc`,
          { headers: headers(SERVICE_KEY) }
        );

        if (!ok) {
          // Pass-through Supabase error body/status
          res.setHeader("Content-Type", "application/json");
          res.status(status).end(text);
          return;
        }

        let data = [];
        try {
          data = JSON.parse(text);
        } catch {
          data = [];
        }

        return json(res, 200, data || []);
      } catch (e) {
        console.error("GET /api/tournaments/:id/players", e);
        return json(res, 500, { error: "server_error" });
      }
    }

    // PATCH /api/tournaments/:id/players/:playerId
    const mPatchPlayer = pathname.match(
      /^\/api\/tournaments\/(\d+)\/players\/(\d+)\/?$/
    );
    if (req.method === "PATCH" && mPatchPlayer) {
      const playerId = Number(mPatchPlayer[2]);
      const body = await readJson(req);
      const { ok, status, text } = await sFetch(
        `/rest/v1/player?id=eq.${playerId}&select=*`,
        {
          method: "PATCH",
          headers: {
            ...headers(SERVICE_KEY),
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(body),
        }
      );
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      return res.end(text);
    }

    // GET /api/tournaments/:id/groups
    const mGroups = pathname.match(/^\/api\/tournaments\/(\d+)\/groups\/?$/);
    if (req.method === "GET" && mGroups) {
      const id = Number(mGroups[1]);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/group?tournament_id=eq.${id}&select=id,name,group_type,round_type,tournament_id,highest_position&order=name.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // GET /api/tournaments/:id/clubs
    const mClubs = pathname.match(/^\/api\/tournaments\/(\d+)\/clubs?\/?$/);
    if (req.method === "GET" && mClubs) {
      const id = Number(mClubs[1]);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/club?tournament_id=eq.${id}&select=id,name,abbreviation,tournament_id,created_at,updated_at&order=name.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // GET /api/tournaments/:id/referees
    const mRefs = pathname.match(/^\/api\/tournaments\/(\d+)\/referees?\/?$/);
    if (req.method === "GET" && mRefs) {
      const id = Number(mRefs[1]);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/referee?tournament_id=eq.${id}&select=id,firstname,lastname,tournament_id,club_id,created_at,updated_at,club:club_id(id,name,abbreviation)&order=lastname.asc&order=firstname.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // GET /api/tournaments/:id/matches
    const mMatches = pathname.match(/^\/api\/tournaments\/(\d+)\/matches\/?$/);
    if (req.method === "GET" && mMatches) {
      const id = Number(mMatches[1]);
      if (!Number.isFinite(id) || id <= 0)
        return json(res, 400, { error: "invalid_tournament_id" });
      const { ok, status, text } = await sFetch(
        `/rest/v1/match?tournament_id=eq.${id}&select=id,tournament_id,group_id,match_day,match_time,table_number,player1:player1_id(id,firstname,lastname,club_id),player2:player2_id(id,firstname,lastname,club_id),group:group_id(id,name,group_type,group_former,highest_position),referee_1:referee1_id(id,firstname,lastname),referee_2:referee2_id(id,firstname,lastname),player1_group_position,player2_group_position,result&order=match_day.asc&order=match_time.asc&order=table_number.asc`,
        { headers: headers(SERVICE_KEY) }
      );
      if (!ok) {
        res.setHeader("Content-Type", "application/json");
        return res.status(status).end(text);
      }
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      return json(res, 200, data);
    }

    // PATCH /api/tournaments/:id/matches/:matchId
    const mPatchMatch = pathname.match(
      /^\/api\/tournaments\/(\d+)\/matches\/(\d+)\/?$/
    );
    if (req.method === "PATCH" && mPatchMatch) {
      const matchId = Number(mPatchMatch[2]);
      const body = await readJson(req);
      const { ok, status, text } = await sFetch(
        `/rest/v1/match?id=eq.${matchId}&select=*`,
        {
          method: "PATCH",
          headers: {
            ...headers(SERVICE_KEY),
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(body),
        }
      );
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      return res.end(text);
    }

    // Fallback
    json(res, 404, { error: "route_not_found", path: pathname });
  } catch (e) {
    json(res, 500, { error: e?.message || "server_error" });
  }
}
