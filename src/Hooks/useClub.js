// src/Hooks/useClub.js
import { useState, useEffect } from "react";
import supabase from "../Helpers/supabaseClient";

/**
 * Hook to fetch the list of clubs for a given tournament.
 *
 * @param {string} tournamentId - The ID of the tournament to filter clubs.
 * @returns {Object}
 * - clubs: Array des clubs du tournoi.
 * - loading: Booléen indiquant si la requête est en cours.
 * - error: Objet d'erreur si la requête a échoué.
 */
export default function useClub(tournamentId) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchClubs = async () => {
      try {
        const { data, error } = await supabase
          .from("club")
          .select("*")
          .eq("tournament_id", tournamentId);

        if (error) throw error;
        setClubs(data || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    // Ne lancer la requête que si on a un tournamentId
    if (tournamentId) {
      fetchClubs();
    } else {
      setClubs([]);
      setLoading(false);
    }
  }, [tournamentId]);

  return { clubs, loading, error };
}
