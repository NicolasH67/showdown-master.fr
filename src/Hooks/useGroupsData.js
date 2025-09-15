import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { get, ApiError } from "../Helpers/apiClient";
import usePlayers from "./usePlayers";

/**
 * Hook personnalisé pour récupérer les groupes et associer les joueurs.
 * @param {string} tournamentId - ID du tournoi.
 * @returns {Object} - Données des groupes et joueurs associés.
 */

// Try a list of endpoints in order and return the first successful JSON
const firstOk = async (paths) => {
  let lastErr = null;
  for (const p of paths) {
    try {
      const json = await get(p);
      return json;
    } catch (e) {
      // If 404, try next; if other error, remember and continue
      lastErr = e;
      if (e?.status !== 404) {
        // non-404 errors might be transient; continue to next fallback
      }
    }
  }
  throw lastErr || new Error("All endpoints failed");
};

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
        const idNum = Number(id);
        if (!Number.isFinite(idNum) || idNum <= 0) {
          throw new Error("Invalid tournament id");
        }

        // Try public first, then protected
        const groupsData = await firstOk([`/api/tournaments/${idNum}/groups`]);

        // Ensure array and, if needed, filter by tournament_id to keep same behavior
        const arr = Array.isArray(groupsData) ? groupsData : [];
        const filtered = arr.filter(
          (g) => g?.tournament_id === idNum || g?.tournament_id == null
        );
        setGroups(filtered);
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
