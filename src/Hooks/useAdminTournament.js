// src/hooks/useTournament.js
import { useState, useEffect } from "react";
import supabase from "../Helpers/supabaseClient";

const useAdminTournament = (id) => {
  const [tournamentData, setTournamentData] = useState({
    title: "",
    startDay: "",
    endDay: "",
    mix: false,
    email: "",
    admin_password: "",
    user_password: "",
    ereferee_password: "",
    table_count: 0,
    match_duration: 0,
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchTournament = async () => {
      const { data, error } = await supabase
        .from("tournament")
        .select("*")
        .eq("id", id);

      if (error) {
        setError("Erreur lors de la récupération des données du tournoi");
        return;
      }

      if (data && data.length > 0) {
        setTournamentData(data[0]);
      }
    };

    if (id) {
      fetchTournament();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTournamentData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("tournament")
      .update(tournamentData)
      .eq("id", id);

    setLoading(false);

    if (error) {
      setError("Erreur lors de la mise à jour du tournoi");
    } else {
      setSuccessMessage(
        "Les paramètres du tournoi ont été mis à jour avec succès"
      );
    }
  };

  return {
    tournamentData,
    loading,
    error,
    successMessage,
    handleChange,
    handleSubmit,
  };
};

export default useAdminTournament;
