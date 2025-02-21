import { useState, useEffect } from "react";
import supabase from "../Helpers/supabaseClient";

/**
 * Custom hook to fetch upcoming tournaments from the database.
 *
 * @returns {Object} - Returns an object containing:
 *   - tournaments: Array of upcoming tournaments.
 *   - loading: Boolean indicating if data is still loading.
 *   - error: Error object if an error occurred.
 */
export const useUpcomingTournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    /**
     * Fetches upcoming tournaments from the Supabase database.
     * Filters tournaments that are ongoing or in the future and sorts them by start date.
     */
    const fetchTournaments = async () => {
      try {
        let { data, error } = await supabase
          .from("tournament")
          .select("id, title, startday, endday, user_password");

        if (error) throw error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filteredTournaments = data
          .filter((tournament) => new Date(tournament.endday) >= today)
          .sort((a, b) => new Date(a.startday) - new Date(b.startday));

        setTournaments(filteredTournaments);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  return { tournaments, loading, error };
};
