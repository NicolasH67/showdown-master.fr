import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * RefereeForm — backend-first version (no direct Supabase from the browser)
 *
 * Creates a referee for a given tournament using authenticated backend routes.
 * Tries, in order:
 *  - POST /api/tournaments/:id/referees
 *  - POST /api/tournaments/referees?id=:id (alias)
 *
 * Both routes are expected to require admin auth via httpOnly cookie
 * (set by /api/auth/admin/login). The request is sent with credentials.
 */
const RefereeForm = ({ tournamentId, clubs, onAddSuccess }) => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [clubId, setClubId] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  const sortClubs = (clubs) => {
    return [...(clubs || [])].sort((a, b) =>
      String(a?.name || "")
        .toLowerCase()
        .localeCompare(String(b?.name || "").toLowerCase())
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const idNum = Number(tournamentId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setMessage(
        t("errorMissingTournamentId", {
          defaultValue: "Invalid tournament id.",
        })
      );
      return;
    }

    const payload = {
      firstname: String(firstname).trim(),
      lastname: String(lastname).trim(),
      club_id: clubId ? Number(clubId) : null,
    };

    if (!payload.firstname || !payload.lastname || !payload.club_id) {
      setMessage(
        t("missingFields", { defaultValue: "Please fill all fields." })
      );
      return;
    }

    setSubmitting(true);

    // Try serverless route first, then alias. Both send cookies.
    const endpoints = [
      `/api/tournaments/${idNum}/referees`,
      `/api/tournaments/referees?id=${idNum}`,
    ];

    let lastErr = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          // Expect created row(s)
          try {
            await res.json();
          } catch (_) {
            // ignore parse error, some backends return empty 201
          }

          setMessage(t("refereeAdded", { defaultValue: "Referee added." }));
          setFirstname("");
          setLastname("");
          setClubId("");
          setSubmitting(false);
          if (onAddSuccess) onAddSuccess();
          return;
        }

        // Non-OK → capture body to show a better error
        let body = null;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        lastErr = new Error(body?.error || `HTTP ${res.status}`);

        // If route not found/allowed, continue to next endpoint
        if (res.status === 404 || res.status === 405) continue;
        // Other error → stop and show
        break;
      } catch (e2) {
        lastErr = e2;
        // try next endpoint
      }
    }

    setSubmitting(false);
    setMessage(
      lastErr?.message || t("serverError", { defaultValue: "Server error" })
    );
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
      <h2 className="mb-3">{t("addReferee")}</h2>
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
          {sortClubs(clubs).map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting
          ? t("saving", { defaultValue: "Saving…" })
          : t("addReferee")}
      </button>
    </form>
  );
};

export default RefereeForm;
