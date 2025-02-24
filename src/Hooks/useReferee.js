import { useEffect, useState } from "react";
import supabase from "../Helpers/supabaseClient";

/**
 * Custom hook to fetch referees for a specific tournament.
 *
 * @param {string} tournamentId - The ID of the tournament to filter referees by.
 * @returns {Object}
 * - referees: The list of referees associated with the given tournament.
 * - loading: A boolean indicating if the data is still being fetched.
 * - error: An error object if an error occurred during fetching.
 */
const useReferees = (tournamentId) => {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tournamentId) {
      console.error("Tournament ID is not defined!");
      return;
    }

    const fetchReferees = async () => {
      try {
        let { data, error } = await supabase
          .from("referee")
          .select(
            `
            id, firstname, lastname, tournament_id,
            club:club_id (id, name)
          `
          )
          .eq("tournament_id", tournamentId);

        if (error) throw error;

        setReferees(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferees();
  }, [tournamentId]);

  return { referees, loading, error };
};

export default useReferees;
