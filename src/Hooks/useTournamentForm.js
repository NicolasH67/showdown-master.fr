import { useState } from "react";
import supabase from "../Helpers/supabaseClient";
import { useNavigate } from "react-router-dom";

const useTournamentForm = () => {
  const [formData, setFormData] = useState({
    title: "",
    startday: "",
    endday: "",
    adminPassword: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { title, startday, endday, adminPassword, email } = formData;

    if (!title || !startday || !endday || !adminPassword || !email) {
      setError("Tous les champs sont requis.");
      return;
    }

    if (new Date(startday) > new Date(endday)) {
      setError("La date de début doit être avant la date de fin.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("L'email est invalide.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("tournament").insert([
        {
          title,
          startday,
          endday,
          user_password: adminPassword,
          admin_password: adminPassword,
          email,
          table_count: 1,
          match_duration: 30,
        },
      ]);

      if (error) throw error;
      navigate("/");
    } catch (error) {
      setError("Une erreur est survenue lors de la création du tournoi.");
    } finally {
      setLoading(false);
    }
  };

  return { formData, handleChange, handleSubmit, error, loading };
};

export default useTournamentForm;
