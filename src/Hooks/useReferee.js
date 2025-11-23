import { useEffect, useState } from "react";
import { get, ApiError } from "../Helpers/apiClient";

/**
 * Fetch referees of a tournament without requiring auth on this page.
 *
 * Strategy:
 *  - Try PUBLIC endpoints first (if you later expose them), otherwise use protected.
 *  - Gracefully fall back on 401/403/404 to the next endpoint.
 *  - If club info is missing on rows, fetch clubs and enrich.
 */
const useReferees = (tournamentId, refreshTrigger = false) => {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setReferees([]);

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
        const errors = [];
        for (const p of paths) {
          try {
            const r = await get(p);
            if (r !== undefined && r !== null) return r; // accept any JSON-ish
          } catch (e) {
            console.warn(
              "[useReferees] endpoint failed:",
              p,
              e?.status || e?.message || e
            );
            errors.push(e);
            continue; // try next path regardless of error type
          }
        }
        if (errors.length) throw errors[errors.length - 1];
        throw new ApiError("not_found", { status: 404, body: null });
      };

      try {
        // 1) Referees (public first if exists, then protected)
        const refereesResp = await firstOk([
          `/api/tournaments/referees?id=${idNum}`,
          `/api/tournaments/${idNum}/referees`,
        ]);

        const rows = Array.isArray(refereesResp)
          ? refereesResp
          : Array.isArray(refereesResp?.referees)
          ? refereesResp.referees
          : [];

        // If club info already present, we're done
        const hasClub =
          rows.length > 0 &&
          ("club" in rows[0] || "club_abbreviation" in rows[0]);
        if (hasClub) {
          if (!cancelled) setReferees(rows);
          return;
        }

        // 2) Clubs (to enrich display with club abbreviation if not provided on referee)
        let clubsById = new Map();
        try {
          const clubsResp = await firstOk([
            `/api/tournaments/clubs?id=${idNum}`,
            `/api/tournaments/${idNum}/clubs`,
            `/api/tournaments/${idNum}/club`,
          ]);
          const clubs = Array.isArray(clubsResp)
            ? clubsResp
            : Array.isArray(clubsResp?.clubs)
            ? clubsResp.clubs
            : [];
          clubsById = new Map(clubs.map((c) => [c.id, c]));
        } catch (_) {
          // If clubs endpoints don't exist, keep referees as-is
        }

        const enriched = rows.map((r) => {
          // If "club" is already embedded, keep it; otherwise add from clubs
          if (!r.club && r.club_id != null) {
            const club = clubsById.get(r.club_id) || null;
            if (club) {
              return { ...r, club };
            }
          }
          return r;
        });

        if (!cancelled) setReferees(enriched);
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
  }, [tournamentId, refreshTrigger]);

  return { referees, loading, error };
};

export default useReferees;
