import { useState } from "react";
import supabase from "../../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";
import "./PlayerForm.css";

const PlayerForm = ({ tournamentId, clubs, groups, onAddSuccess }) => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [groupId, setGroupId] = useState("");
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
          group_id: groupId,
          club_id: clubId,
          tournament_id: tournamentId,
        },
      ]);
      if (error) throw error;

      setMessage(t("playerAdded"));
      setFirstname("");
      setLastname("");
      setGroupId("");
      setClubId("");

      if (onAddSuccess) {
        onAddSuccess(); // ✅ Rafraîchir après un ajout réussi
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  console.log(clubs[0].name);

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
        <label className="form-label">{t("from")}:</label>
        <select
          className="form-select w-100"
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          required
        >
          <option value="">{t("from")}</option>
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
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          required
        >
          <option value="">{t("selectGroup")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} - {group.group_type}
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
