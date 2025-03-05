import { useState } from "react";
import supabase from "../../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";

const PlayerForm = ({ tournamentId, clubs, divisions }) => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [clubId, setClubId] = useState("");
  const [message, setMessage] = useState(null);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("player").insert([
        {
          firstname,
          lastname,
          division_id: divisionId,
          club_id: clubId,
          tournament_id: tournamentId,
        },
      ]);
      if (error) throw error;
      setMessage(t("playerAdded"));
      setFirstname("");
      setLastname("");
      setDivisionId("");
      setClubId("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
      <h2 className="mb-3">{t("addPlayer")}</h2>
      {message && <div className="alert alert-info">{message}</div>}
      <div className="mb-3">
        <label className="form-label">{t("firstname")}:</label>
        <input
          type="text"
          className="form-control"
          value={firstname}
          onChange={(e) => setFirstname(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">{t("lastname")}:</label>
        <input
          type="text"
          className="form-control"
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">{t("club")}:</label>
        <select
          className="form-select"
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          required
        >
          <option value="">{t("selectClub")}</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">{t("firstGroup")}:</label>
        <select
          className="form-select"
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
          required
        >
          <option value="">{t("selectGroup")}</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.name} - {division.group_type}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primary">
        {t("addPlayer")}
      </button>
    </form>
  );
};

export default PlayerForm;
