import { useState, useEffect } from "react";
import supabase from "../Helpers/supabaseClient";

export const useTournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        let { data, error } = await supabase
          .from("tournament")
          .select("id, title, startday, endday, user_password");

        if (error) throw error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filteredTournaments = data
          .filter((tournament) => new Date(tournament.startday) >= today)
          .sort((a, b) => new Date(a.startday) - new Date(b.startday));

        setTournaments(filteredTournaments);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  return { tournaments, loading, error };
};
