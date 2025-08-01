import supabase from "../Helpers/supabaseClient";
import { useState, useEffect } from "react";

const useTournamentData = (tournamentId, refreshTrigger) => {
  const [groups, setGroups] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          { data: groupData, error: groupError },
          { data: clubData, error: clubError },
          { data: playerData, error: playerError },
          { data: refereeData, error: refereeError },
        ] = await Promise.all([
          supabase
            .from("group")
            .select("id, name, tournament_id, round_type, group_type"),
          supabase.from("club").select("id, name, tournament_id, abbreviation"),
          supabase
            .from("player")
            .select(
              "id, firstname, lastname, club:club_id (id, name, abbreviation), tournament_id, group_id"
            ),
          supabase
            .from("referee")
            .select(
              "id, firstname, lastname, club:club_id (id, name, abbreviation), tournament_id"
            ),
        ]);

        if (groupError) throw groupError;
        if (clubError) throw clubError;
        if (playerError) throw playerError;
        if (refereeError) throw refereeError;

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
        setPlayers(
          playerData.filter(
            (player) => player.tournament_id === Number(tournamentId)
          )
        );
        setReferees(
          refereeData.filter(
            (referee) => referee.tournament_id === Number(tournamentId)
          )
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) fetchData();
  }, [tournamentId, refreshTrigger]); // Ajout de refreshTrigger comme dépendance

  const playersWithGroups = players.map((player) => {
    const groupNames = player.group_id
      ?.map((id) => groups.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    return { ...player, groupNames };
  });

  return {
    groups,
    clubs,
    players,
    playersWithGroups,
    referees,
    loading,
    error,
  };
};

export default useTournamentData;
