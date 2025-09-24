import { useState, useEffect } from "react";
import { get } from "../Helpers/apiClient";

/**
 * Custom hook to fetch tournaments from the database (either past or upcoming).
 *
 * @param {boolean} isPast - If true, fetch past tournaments. If false, fetch upcoming tournaments.
 * @returns {Object} - Returns an object containing:
 *   - tournaments: Array of tournaments.
 *   - loading: Boolean indicating if data is still loading.
 *   - error: Error object if an error occurred.
 */
export const useTournaments = (isPast) => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    /**
     * Fetches tournaments from the Supabase database based on whether they are past or upcoming.
     */
    const fetchTournaments = async () => {
      try {
        const list = await get(`/api/tournaments?past=${isPast ? 1 : 0}`);
        const data = Array.isArray(list) ? list : [];
        // Optionnel: re-trier côté client par startday croissant
        const sorted = data.sort(
          (a, b) => new Date(a.startday) - new Date(b.startday)
        );
        setTournaments(sorted);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [isPast]);

  return { tournaments, loading, error };
};
