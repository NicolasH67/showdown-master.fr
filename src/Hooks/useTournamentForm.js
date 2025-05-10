import { useState } from "react";
import { useTranslation } from "react-i18next";
import supabase from "../Helpers/supabaseClient";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook to manage the tournament creation form.
 *
 * @returns {Object}
 * - formData: The current state of the form data.
 * - handleChange: Function to update the state for each form field.
 * - handleSubmit: Function to handle the form submission.
 * - error: Error message if validation fails.
 * - loading: Loading indicator while submitting data to the database.
 */
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
  const { t } = useTranslation();
  if (!t) throw new Error("Translation function 't' is not available");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { title, startday, endday, adminPassword, email } = formData;

    if (!title || !startday || !endday || !adminPassword || !email) {
      setError(t("allFieldsRequired"));
      return;
    }

    if (new Date(startday) > new Date(endday)) {
      setError(t("errorStartDateBeforeEndDate"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("invalidEmail"));
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
      setError(t("errorCreatingTournament"));
    } finally {
      setLoading(false);
    }
  };

  return { formData, handleChange, handleSubmit, error, loading };
};

export default useTournamentForm;
