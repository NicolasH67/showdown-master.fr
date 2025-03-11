import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import supabase from "../Helpers/supabaseClient";
import usePlayers from "./usePlayers";

/**
 * Hook personnalisé pour récupérer les groupes et associer les joueurs.
 * @param {string} tournamentId - ID du tournoi.
 * @returns {Object} - Données des groupes et joueurs associés.
 */
const useGroupsData = () => {
  const { id } = useParams();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRound, setSelectedRound] = useState("1st round");
  const {
    players,
    loading: playersLoading,
    error: playersError,
  } = usePlayers(id);

  useEffect(() => {
    if (!id) {
      console.error("Tournament ID is not defined!");
      return;
    }

    const fetchGroups = async () => {
      try {
        let { data: groupsData, error: groupsError } = await supabase
          .from("group")
          .select(
            "id, name, round_type, group_type, tournament_id, group_former, highest_position"
          );

        if (groupsError) {
          throw groupsError;
        }

        const parsedTournamentId = parseInt(id, 10);
        const filteredGroups = groupsData.filter(
          (group) => group.tournament_id === parsedTournamentId
        );

        setGroups(filteredGroups);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [id]);

  return {
    groups,
    setGroups,
    players,
    loading: loading || playersLoading,
    error: error || playersError,
    selectedRound,
    setSelectedRound,
  };
};

export default useGroupsData;
