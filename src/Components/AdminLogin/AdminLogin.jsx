app.post("/auth/admin/login", async (req, res) => {
  // Structured debug wrapper to avoid swallowing the real error
  const dbgPrefix = "→ [POST] /auth/admin/login";
  try {
    dbg(`${dbgPrefix} called`, { body: maskBody(req.body) });

    // 1) Basic input validation
    const { tournamentId, password } = req.body || {};
    const idNum = Number(tournamentId);
    const pwd = typeof password === "string" ? password.trim() : "";

    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "missing_tournament_id" });
    }
    if (!pwd) {
      return res.status(400).json({ error: "missing_password" });
    }

    // 2) Read tournament row
    const { data: t, error: dbErr } = await supabase
      .from("tournament")
      .select("id, admin_password_hash, user_password_hash, is_private")
      .eq("id", idNum)
      .single();

    if (dbErr) {
      console.error(`${dbgPrefix} supabase error`, dbErr);
      return res.status(500).json({ error: "db_error" });
    }
    if (!t) {
      return res.status(404).json({ error: "not_found" });
    }

    // 3) Determine which stored secret to compare against
    const bcrypt = require("bcryptjs");
    let candidate = t.admin_password_hash || t.user_password_hash || null;

    if (!candidate) {
      // No password present in DB
      return res.status(401).json({ error: "invalid_credentials" });
    }

    // If DB value is CLEAR TEXT (old data), accept once, then upgrade to bcrypt
    const looksLikeBcrypt =
      typeof candidate === "string" && candidate.startsWith("$2");
    if (!looksLikeBcrypt) {
      if (pwd !== String(candidate)) {
        return res.status(401).json({ error: "invalid_credentials" });
      }
      try {
        const upgraded = await bcrypt.hash(pwd, 10);
        const { error: upErr } = await supabase
          .from("tournament")
          .update({ admin_password_hash: upgraded })
          .eq("id", idNum);
        if (upErr) {
          console.error(`${dbgPrefix} bcrypt upgrade failed`, upErr);
          // Even if upgrading failed, we still allow login now
        }
        candidate = upgraded;
      } catch (e) {
        console.error(`${dbgPrefix} bcrypt upgrade exception`, e);
        // Fallback to allowing login for this request
      }
    } else {
      // 4) Standard bcrypt compare
      let okCompare = false;
      try {
        okCompare = await bcrypt.compare(pwd, candidate);
      } catch (e) {
        console.error(`${dbgPrefix} bcrypt.compare failed`, e);
        return res.status(500).json({ error: "bcrypt_error" });
      }
      if (!okCompare) {
        return res.status(401).json({ error: "invalid_credentials" });
      }
    }

    // 5) Check JWT secret BEFORE signing to avoid generic 500
    const secretOk =
      !!process.env.JWT_SECRET && String(process.env.JWT_SECRET).length >= 32;
    if (!secretOk) {
      console.error(`${dbgPrefix} missing JWT_SECRET`);
      return res.status(500).json({ error: "missing_jwt_secret" });
    }

    // 6) Issue token + cookie
    let token;
    try {
      token = sign({ scope: "admin", tournament_id: idNum });
    } catch (e) {
      console.error(`${dbgPrefix} sign() failed`, e);
      return res.status(500).json({ error: "jwt_sign_failed" });
    }

    try {
      setSessionCookie(res, token, 12 * 60 * 60 * 1000);
    } catch (e) {
      console.error(`${dbgPrefix} setSessionCookie failed`, e, {
        cookieName: process.env.COOKIE_NAME,
        cookieDomain: process.env.COOKIE_DOMAIN,
        cookieSecure: process.env.COOKIE_SECURE,
      });
      // On envoie quand même 200 pour éviter un 500 si seul le set-cookie échoue côté platform,
      // mais on expose un code d'avertissement pour le front si besoin.
      return res.status(200).json({ ok: true, warn: "cookie_set_failed" });
    }

    return res.json({ ok: true });
  } catch (e) {
    // Dernier filet de sécurité : retourne le code précis si possible
    console.error("[/auth/admin/login] unhandled", e?.message || e);
    return res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/debug/auth-env", (req, res) => {
  const cookieSecure = String(process.env.COOKIE_SECURE || "").toLowerCase();
  res.json({
    hasJWT_SECRET: !!process.env.JWT_SECRET,
    JWT_SECRET_len: process.env.JWT_SECRET
      ? String(process.env.JWT_SECRET).length
      : 0,
    cookie: {
      name: process.env.COOKIE_NAME || null,
      domain: process.env.COOKIE_DOMAIN || null,
      secure: cookieSecure || null,
    },
    cors: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || null,
    vercel: !!process.env.VERCEL_URL,
    nodeEnv: process.env.NODE_ENV || null,
  });
});
