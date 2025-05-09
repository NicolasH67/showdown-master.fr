import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import supabase from "../Helpers/supabaseClient";

/**
 * `useMatches` Hook
 * @function
 * @description Fetches match data for a specific tournament and manages loading and error states.
 * @returns {Object} - An object containing match data, loading status, and error information.
 * @property {Array} matches - List of matches.
 * @property {boolean} loading - Indicates if the data is still being fetched.
 * @property {Error|null} error - Error object if an error occurs, otherwise null.
 */
const useMatches = () => {
  const { id } = useParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        let { data, error } = await supabase
          .from("match")
          .select(
            `
            id,
            player1:player1_id(id, firstname, lastname),
            player2:player2_id(id, firstname, lastname),
            group:group_id(name, group_type),
            match_day,
            match_time,
            table_number,
            referee_1:referee1_id(id, firstname, lastname),
            referee_2:referee2_id(id, firstname, lastname),
            result
          `
          )
          .eq("tournament_id", id);

        if (error) throw error;

        data.sort((a, b) => {
          const dateA = new Date(`${a.match_day}T${a.match_time}`);
          const dateB = new Date(`${b.match_day}T${b.match_time}`);
          return dateA - dateB || a.table_number - b.table_number;
        });

        setMatches(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [id]);

  return { matches, loading, error };
};

export default useMatches;
