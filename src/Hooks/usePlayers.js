import { useEffect, useState } from "react";
import supabase from "../Helpers/supabaseClient";

/**
 * Custom hook to fetch and filter players for a specific tournament.
 *
 * @param {string} tournamentId - The ID of the tournament to filter players by.
 * @returns {Object}
 * - players: The list of players associated with the given tournament.
 * - loading: A boolean indicating if the data is still being fetched.
 * - error: An error object if an error occurred during fetching.
 */
const usePlayers = (tournamentId) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tournamentId) {
      console.error("Tournament ID is not defined!");
      return;
    }

    const fetchPlayers = async () => {
      try {
        let { data, error } = await supabase.from("player").select(`
          id, firstname, lastname, tournament_id, 
          group:group_id (id, name, group_type)
        `);

        if (error) throw error;

        const parsedTournamentId = parseInt(tournamentId, 10);
        const filteredPlayers = data.filter(
          (player) => player.tournament_id === parsedTournamentId
        );
        setPlayers(filteredPlayers);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [tournamentId]);

  return { players, loading, error };
};

export default usePlayers;
