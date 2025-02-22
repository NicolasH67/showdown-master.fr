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
        let { data: divisionsData, error: divisionsError } = await supabase
          .from("division")
          .select("id, name, round_type, group_type, tournament_id");

        if (divisionsError) {
          throw divisionsError;
        }

        const parsedTournamentId = parseInt(id, 10);
        const filteredDivisions = divisionsData.filter(
          (division) => division.tournament_id === parsedTournamentId
        );

        setGroups(filteredDivisions);
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
    players,
    loading: loading || playersLoading,
    error: error || playersError,
    selectedRound,
    setSelectedRound,
  };
};

export default useGroupsData;
