// api/tournaments/auth.js — Vercel Node.js API route (no serverless wrapper)
// Usage: POST /api/tournaments/auth  { tournamentId, password }

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { sign, setSessionCookie } from "../../backend/auth/tokens.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const mask = (b) => {
  try {
    if (!b || typeof b !== "object") return b;
    const c = { ...b };
    ["password", "adminPassword", "userPassword", "pass"].forEach((k) => {
      if (c[k] != null) c[k] = "***";
    });
    return c;
  } catch {
    return b;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({
        error: "Method Not Allowed",
        hint: "Use POST with JSON { tournamentId, password }",
      });
  }

  try {
    const { tournamentId, password } = req.body || {};
    const idNum = Number(tournamentId);
    const pwd = typeof password === "string" ? password.trim() : "";

    if (!Number.isFinite(idNum) || idNum <= 0 || pwd.length === 0) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const { data: t, error } = await supabase
      .from("tournament")
      .select("id, admin_password_hash, user_password_hash")
      .eq("id", idNum)
      .single();

    if (error || !t) return res.status(404).json({ error: "not_found" });

    let candidate = t.admin_password_hash || t.user_password_hash || null;
    if (!candidate)
      return res.status(401).json({ error: "Invalid credentials" });

    // Si l'ancien champ n'est pas un hash bcrypt ($2...), on compare en clair puis on upgrade
    const looksLikeBcrypt =
      typeof candidate === "string" && candidate.startsWith("$2");
    if (!looksLikeBcrypt) {
      if (pwd !== String(candidate)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const upgraded = await bcrypt.hash(pwd, 10);
      await supabase
        .from("tournament")
        .update({ admin_password_hash: upgraded })
        .eq("id", idNum);
      candidate = upgraded;
    }

    const ok = await bcrypt.compare(pwd, candidate);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = sign({ scope: "admin", tournament_id: idNum });
    // Pose un cookie HttpOnly de session (12h)
    setSessionCookie(res, token, 12 * 60 * 60 * 1000);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[/api/tournaments/auth] error", e?.message, {
      body: mask(req.body),
    });
    return res.status(500).json({ error: "server_error" });
  }
}
