import { useEffect, useState } from "react";
import supabase from "../Helpers/supabaseClient";

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
          division:division_id (id, name, group_type)
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
