import { useEffect, useState } from "react";
import { get, ApiError } from "../Helpers/apiClient";

/**
 * Fetch players of a tournament without requiring auth on this page.
 *
 * Strategy:
 *  - Try PUBLIC endpoints first: /api/public/tournaments/:id/players and /api/public/tournaments/:id/groups
 *  - If they don't exist (404) or are disabled, fall back to protected endpoints.
 */
const usePlayers = (tournamentId) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setPlayers([]);

      const idNum = Number(tournamentId);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        if (!cancelled) {
          setError(new Error("Invalid tournament id"));
          setLoading(false);
        }
        return;
      }

      // helper that tries a list of endpoints in order and returns the first successful JSON
      const firstOk = async (paths) => {
        for (const p of paths) {
          try {
            const r = await get(p);
            return r;
          } catch (e) {
            // If it's a 401/403/404, try the next path; otherwise bubble up
            if (e instanceof ApiError) {
              if ([401, 403, 404].includes(e.status)) continue;
            }
            throw e;
          }
        }
        // nothing worked → throw a 404-like error
        throw new ApiError("not_found", { status: 404, body: null });
      };

      try {
        // 1) Players (public first, then protected)
        const playersResp = await firstOk([
          `/api/tournaments/players?id=${idNum}`,
          `/api/tournaments/${idNum}/players`,
        ]);

        console.log(playersResp);

        const rows = Array.isArray(playersResp)
          ? playersResp
          : Array.isArray(playersResp?.players)
          ? playersResp.players
          : [];

        // If group info is already present, we're done
        const hasGroup =
          rows.length > 0 && ("group" in rows[0] || "group_type" in rows[0]);
        if (hasGroup) {
          if (!cancelled) setPlayers(rows);
          return;
        }

        // 2) Groups (public first, then protected)
        let groupsById = new Map();
        try {
          const groupsResp = await firstOk([
            `/api/tournaments/${idNum}/groups`,
          ]);
          const groups = Array.isArray(groupsResp)
            ? groupsResp
            : Array.isArray(groupsResp?.groups)
            ? groupsResp.groups
            : [];
          groupsById = new Map(groups.map((g) => [g.id, g]));
        } catch (_) {
          // if groups endpoints don't exist, keep players as-is
        }

        const enriched = rows.map((p) => {
          const mainGroupId =
            Array.isArray(p.group_id) && p.group_id.length > 0
              ? p.group_id[0]
              : null;
          const group =
            mainGroupId != null ? groupsById.get(mainGroupId) || null : null;
          return { ...p, group };
        });

        if (!cancelled) setPlayers(enriched);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  return { players, loading, error };
};

export default usePlayers;
