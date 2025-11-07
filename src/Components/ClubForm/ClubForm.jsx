import { useState } from "react";
import { useTranslation } from "react-i18next";

const ClubForm = ({ tournamentId, onAddSuccess }) => {
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

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

    // Essaye d’abord la route serverless Vercel, puis une éventuelle route monolithe
    const endpoints = [
      `/api/tournaments/${idNum}/clubs`,
      `/tournaments/${idNum}/clubs`,
    ];

    let lastErr = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          credentials: "include", // cookie admin httpOnly
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          // Certaines implémentations renvoient l’objet inséré, d’autres rien : on gère les deux
          try {
            await res.json();
          } catch {
            /* pas grave */
          }

          setMessage(t("clubAdded", { defaultValue: "Club ajouté." }));
          setName("");
          setAbbreviation("");
          if (onAddSuccess) onAddSuccess();
          setSubmitting(false);
          return;
        }

        // Récupère le message d’erreur quand dispo
        let body = null;
        try {
          body = await res.json();
        } catch {}
        lastErr = body?.error || body || `${res.status}`;
        // Si 404/405, on essaie l’URL suivante. Sinon on arrête.
        if (res.status !== 404 && res.status !== 405) break;
      } catch (err) {
        lastErr = err?.message || err;
        // on tente l’URL suivante
      }
    }

    // Échec sur toutes les variantes
    let msg = t("clubAddFailed", { defaultValue: "Échec de l’ajout du club." });
    // Messages un peu plus parlants selon les cas fréquents
    if (
      String(lastErr).toLowerCase().includes("unauthorized") ||
      String(lastErr).includes("401")
    ) {
      msg = t("unauthorized", {
        defaultValue: "Non autorisé. Connectez-vous en admin.",
      });
    } else if (String(lastErr).includes("403")) {
      msg = t("forbidden", {
        defaultValue: "Accès interdit. Droit admin requis.",
      });
    }
    setMessage(msg);
    setSubmitting(false);
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
