// src/Hooks/useClub.js
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { get } from "../Helpers/apiClient";

// Try endpoints in order; return first successful JSON
const firstOk = async (paths) => {
  let lastErr = null;
  for (const p of paths) {
    try {
      const json = await get(p);
      return json;
    } catch (e) {
      lastErr = e;
      // continue to next; 404 or other errors will fall through to the next path
    }
  }
  throw lastErr || new Error("All endpoints failed");
};

/**
 * Hook to fetch the list of clubs for a given tournament.
 *
 * @param {string|number} tournamentIdParam - Optional tournament id. If omitted, falls back to route param `id`.
 * @returns {{ clubs: Array, loading: boolean, error: any }}
 */
export default function useClub(tournamentIdParam) {
  const { id: routeId } = useParams();
  const tid = tournamentIdParam ?? routeId;

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      const idNum = Number(tid);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        setClubs([]);
        setLoading(false);
        return;
      }

      try {
        const data = await firstOk([
          `
          /api/tournaments/${idNum}/clubs`,
          `/api/tournaments/clubs?id=${idNum}`,
        ]);
        if (!alive) return;
        setClubs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || e);
        setClubs([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [tid]);

  return { clubs, loading, error };
}
