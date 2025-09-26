import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { get, ApiError } from "../Helpers/apiClient";

// Try a list of endpoints in order and return the first successful JSON
const firstOk = async (paths) => {
  let lastErr = null;
  for (const p of paths) {
    try {
      const json = await get(p);
      return json;
    } catch (e) {
      lastErr = e;
      if (e?.status !== 404) {
        // continue to next fallback
      }
    }
  }
  throw lastErr || new Error("All endpoints failed");
};

/**
 * `useMatches` Hook
 * @function
 * @description Fetches match data for a specific tournament and manages loading and error states.
 * @returns {Object} - An object containing match data, loading status, and error information.
 * @property {Array} matches - List of matches.
 * @property {boolean} loading - Indicates if the data is still being fetched.
 * @property {Error|null} error - Error object if an error occurs, otherwise null.
 */
const useMatches = () => {
  const { id } = useParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const idNum = Number(id);
        if (!Number.isFinite(idNum) || idNum <= 0) {
          throw new Error("Invalid tournament id");
        }

        // Try all possible endpoints for both local and Vercel environments
        const data = await firstOk([
          `/api/tournaments/matches?id=${idNum}`,
          `/api/tournaments/${idNum}/matches`,
          `/api/tournaments/match?id=${idNum}`,
          `/api/tournaments/${idNum}/match`,
        ]);

        const arr = Array.isArray(data) ? data : [];

        arr.sort((a, b) => {
          const dateA = new Date(`${a.match_day}T${a.match_time}`);
          const dateB = new Date(`${b.match_day}T${b.match_time}`);
          return dateA - dateB || a.table_number - b.table_number;
        });

        setMatches(arr);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [id]);

  return { matches, loading, error };
};

export default useMatches;
