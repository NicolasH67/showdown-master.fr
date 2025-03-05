import { useState, useEffect } from "react";
import supabase from "../Helpers/supabaseClient";

const useTournamentData = (tournamentId) => {
  const [divisions, setDivisions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          { data: divisionData, error: divisionError },
          { data: clubData, error: clubError },
        ] = await Promise.all([
          supabase
            .from("division")
            .select("id, name, tournament_id, round_type, group_type"),
          supabase.from("club").select("id, name, tournament_id"),
        ]);

        if (divisionError) throw divisionError;
        if (clubError) throw clubError;

        setDivisions(
          divisionData.filter(
            (division) =>
              division.tournament_id === Number(tournamentId) &&
              division.round_type === "1st round"
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

  return { divisions, clubs, loading, error };
};

export default useTournamentData;
