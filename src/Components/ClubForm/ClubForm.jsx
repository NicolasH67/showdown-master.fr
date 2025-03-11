import { useState } from "react";
import supabase from "../../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";

const ClubForm = ({ tournamentId, onAddSuccess }) => {
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [message, setMessage] = useState(null);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("club")
        .insert([{ name, abbreviation, tournament_id: tournamentId }]);
      if (error) throw error;

      setMessage(t("clubAdded"));
      setName("");
      setAbbreviation("");

      if (onAddSuccess) {
        onAddSuccess(); // ✅ Rafraîchir après un ajout réussi
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
      <h2 className="mb-3">{t("addClub")}</h2>
      {message && <div className="alert alert-info">{message}</div>}
      <div className="mb-3">
        <label className="form-label">{t("clubName")}</label>
        <input
          type="text"
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">{t("abbreviation")}</label>
        <input
          type="text"
          className="form-control"
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary">
        {t("addClub")}
      </button>
    </form>
  );
};

export default ClubForm;
