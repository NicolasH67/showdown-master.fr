import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import supabase from "../Helpers/supabaseClient";

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
            player1:player1_id(firstname, lastname),
            player2:player2_id(firstname, lastname),
            division:division_id(name),
            match_date,
            match_time,
            table_number,
            referee_1:referee1_id(firstname, lastname),
            referee_2:referee2_id(firstname, lastname),
            result
          `
          )
          .eq("tournament_id", id);

        if (error) throw error;

        data.sort((a, b) => {
          const dateA = new Date(`${a.match_date}T${a.match_time}`);
          const dateB = new Date(`${b.match_date}T${b.match_time}`);
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
