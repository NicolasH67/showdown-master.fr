import { useState } from "react";
import { useTranslation } from "react-i18next";

const ClubForm = ({ tournamentId, onAddSuccess }) => {
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const API_BASE = import.meta.env.VITE_API_BASE || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const idNum = Number(tournamentId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setMessage(
        t("errorMissingTournamentId", {
          defaultValue: "ID du tournoi manquant.",
        })
      );
      return;
    }

    setSubmitting(true);
    const payload = { name: name.trim(), abbreviation: abbreviation.trim() };

    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${idNum}/clubs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = t("clubAddFailed", {
          defaultValue: "Échec de l’ajout du club.",
        });
        if (res.status === 401) {
          msg = t("unauthorized", {
            defaultValue: "Non autorisé. Connectez-vous en admin.",
          });
        } else if (res.status === 403) {
          msg = t("forbidden", {
            defaultValue: "Accès interdit. Droit admin requis.",
          });
        }
        console.error("Club create failed:", res.status, text);
        setMessage(msg);
        setSubmitting(false);
        return;
      }

      setMessage(t("clubAdded", { defaultValue: "Club ajouté." }));
      setName("");
      setAbbreviation("");
      if (onAddSuccess) onAddSuccess();
      setSubmitting(false);
      return;
    } catch (err) {
      console.error("Club create error:", err);
      let msg = t("clubAddFailed", {
        defaultValue: "Échec de l’ajout du club.",
      });
      setMessage(msg);
      setSubmitting(false);
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
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting
          ? t("saving", { defaultValue: "Enregistrement..." })
          : t("addClub")}
      </button>
    </form>
  );
};

export default ClubForm;
