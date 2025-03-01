import { useState, useEffect } from "react";
import supabase from "../Helpers/supabaseClient";

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
        let { data, error } = await supabase
          .from("tournament")
          .select("id, title, startday, endday, user_password, admin_password");

        if (error) throw error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filteredTournaments = data
          .filter((tournament) => {
            if (isPast) {
              return new Date(tournament.endday) <= today;
            } else {
              return new Date(tournament.endday) >= today;
            }
          })
          .sort((a, b) => new Date(a.startday) - new Date(b.startday));

        setTournaments(filteredTournaments);
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
