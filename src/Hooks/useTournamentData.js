import { useState, useEffect } from "react";
import supabase from "../Helpers/supabaseClient";

const useTournamentData = (tournamentId) => {
  const [groups, setGroups] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          { data: groupData, error: groupError },
          { data: clubData, error: clubError },
        ] = await Promise.all([
          supabase
            .from("group")
            .select("id, name, tournament_id, round_type, group_type"),
          supabase.from("club").select("id, name, tournament_id"),
        ]);

        if (groupError) throw groupError;
        if (clubError) throw clubError;

        setGroups(
          groupData.filter(
            (group) =>
              group.tournament_id === Number(tournamentId) &&
              group.round_type === "1st round"
          )
        );
        setClubs(
          clubData.filter((club) => club.tournament_id === Number(tournamentId))
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) fetchData();
  }, [tournamentId]);

  return { groups, clubs, loading, error };
};

export default useTournamentData;
