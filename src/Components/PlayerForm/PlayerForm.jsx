import { useState } from "react";
import { post } from "../../Helpers/apiClient";
import { useTranslation } from "react-i18next";
import "./PlayerForm.css";

const PlayerForm = ({ tournamentId, clubs, groups, onAddSuccess }) => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [groupId, setGroupId] = useState("");
  const [clubId, setClubId] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const idNum = Number(tournamentId);
      const gid = Number(groupId);
      const cid = Number(clubId);

      if (
        !Number.isFinite(idNum) ||
        !Number.isFinite(gid) ||
        !Number.isFinite(cid)
      ) {
        throw new Error("Invalid form values");
      }

      const payload = {
        firstname: String(firstname).trim(),
        lastname: String(lastname).trim(),
        group_id: [gid],
        club_id: cid,
        tournament_id: idNum,
      };

      // Try backend (admin-protected) endpoint first
      try {
        await post(`/api/tournaments/${idNum}/players`, payload);
      } catch (err) {
        // If running locally without the serverless endpoint (404/405),
        // fallback to legacy direct insert via Supabase anon (kept for dev)
        const status = err?.status || err?.body?.status;
        if (status !== 404 && status !== 405) {
          throw err;
        }
        // dynamic import to avoid bundling supabase client when not needed
        const { default: supabase } = await import(
          "../../Helpers/supabaseClient"
        );
        const { error } = await supabase.from("player").insert([payload]);
        if (error) throw error;
      }

      setMessage(t("playerAdded"));
      setFirstname("");
      setLastname("");
      setGroupId("");
      setClubId("");
      if (onAddSuccess) onAddSuccess();
    } catch (error) {
      setMessage(error?.body?.error || error?.message || String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const sortClubs = (clubs) => {
    return [...clubs].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
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
          autoFocus
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
          <option value="">
            {t("selectClub", { defaultValue: "Select a club" })}
          </option>
          {sortClubs(clubs).map((club) => (
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
              {group.name} - {t(group.group_type)}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting
          ? t("saving", { defaultValue: "Saving..." })
          : t("addPlayer")}
      </button>
    </form>
  );
};

export default PlayerForm;
