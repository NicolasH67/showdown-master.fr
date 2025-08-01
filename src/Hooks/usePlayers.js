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
          id, firstname, lastname, tournament_id, group_id, 
          club:club_id (id, name, abbreviation)
        `);

        if (error) throw error;

        const { data: groupsData, error: groupsError } = await supabase
          .from("group")
          .select("id, name, group_type");
        if (groupsError) throw groupsError;

        const enrichedPlayers = data.map((player) => {
          const mainGroupId = Array.isArray(player.group_id)
            ? player.group_id[0]
            : null;
          const group = groupsData.find((g) => g.id === mainGroupId);
          return { ...player, group };
        });

        const parsedTournamentId = parseInt(tournamentId, 10);
        const filteredPlayers = enrichedPlayers.filter(
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
