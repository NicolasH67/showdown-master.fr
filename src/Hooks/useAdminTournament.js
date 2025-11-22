// src/Hooks/useAdminTournament.js
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { get, ApiError } from "../Helpers/apiClient";

/**
 * useAdminTournament
 *
 * Récupère et met à jour un tournoi côté admin via les routes /api/admin,
 * sans appel direct à Supabase.
 *
 * Stratégie de fetch :
 *  - Essaye plusieurs endpoints dans l'ordre :
 *      /api/admin/tournaments/:id
 *      /api/admin/tournaments?id=:id
 *      /api/tournaments/:id
 *      /api/tournaments?id=:id
 *  - Le premier qui répond correctement est utilisé.
 *
 * Mise à jour :
 *  - PATCH sur /api/admin/tournaments/:id avec un payload normalisé
 *    (startday/endday, table_count, match_duration, etc.).
 */
const useAdminTournament = (id) => {
  const { t } = useTranslation();

  const [tournamentData, setTournamentData] = useState({
    title: "",
    startDay: "",
    endDay: "",
    email: "",
    table_count: 0,
    match_duration: 0,
    location: "",
    // champ purement frontend pour l’instant (la BDD n’a pas mix)
    mix: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!id) return;

      const idNum = Number(id);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        if (!cancelled) {
          setError(t("invalidTournamentId") || "Invalid tournament id");
        }
        return;
      }

      setLoading(true);
      setError("");
      setSuccessMessage("");

      // helper qui essaie une liste d'endpoints dans l'ordre
      const firstOk = async (paths) => {
        const errors = [];
        for (const p of paths) {
          try {
            const r = await get(p);
            if (r !== undefined && r !== null) return r;
          } catch (e) {
            console.warn(
              "[useAdminTournament] endpoint failed:",
              p,
              e?.status || e?.message || e
            );
            errors.push(e);
          }
        }
        if (errors.length) throw errors[errors.length - 1];
        throw new ApiError("not_found", { status: 404, body: null });
      };

      try {
        const resp = await firstOk([
          // Endpoints côté admin en priorité
          `/api/admin/tournaments/${idNum}`,
          `/api/admin/tournaments?id=${idNum}`,
          // Fallback sur les endpoints génériques si besoin
          `/api/tournaments/${idNum}`,
          `/api/tournaments?id=${idNum}`,
        ]);

        let tournament = null;
        if (Array.isArray(resp)) {
          tournament = resp[0] || null;
        } else if (resp && typeof resp === "object") {
          // cas où la réponse serait de la forme { tournament: {...} }
          if (resp.tournament) tournament = resp.tournament;
          else tournament = resp;
        }

        if (!cancelled && tournament) {
          setTournamentData((prev) => ({
            ...prev,
            // Champs simples
            title: tournament.title ?? prev.title,
            email: tournament.email ?? prev.email,
            location: tournament.location ?? prev.location,
            // Dates : la base renvoie startday/endday, le state utilise startDay/endDay
            startDay:
              tournament.startDay ?? tournament.startday ?? prev.startDay,
            endDay: tournament.endDay ?? tournament.endday ?? prev.endDay,
            // Tables : table_count (snake) ou tableCount (camel)
            table_count:
              typeof tournament.table_count === "number"
                ? tournament.table_count
                : typeof tournament.tableCount === "number"
                ? tournament.tableCount
                : prev.table_count,
            // Durée des matchs : match_duration (snake) ou matchDuration (camel)
            match_duration:
              typeof tournament.match_duration === "number"
                ? tournament.match_duration
                : typeof tournament.matchDuration === "number"
                ? tournament.matchDuration
                : prev.match_duration,
            // mix : pas en BDD pour l’instant, on garde la valeur locale
            mix: prev.mix,
          }));
        }
      } catch (e) {
        if (!cancelled) {
          console.error("[useAdminTournament] fetch error:", e);
          setError(
            t("errorFetchingTournamentData") ||
              e.message ||
              "Error fetching tournament data"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTournamentData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const idNum = Number(id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setError(t("invalidTournamentId") || "Invalid tournament id");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // On construit un payload propre, mappé sur les colonnes BDD
      const payload = {
        title: tournamentData.title,
        startday: tournamentData.startDay || null,
        endday: tournamentData.endDay || null,
        email: tournamentData.email,
        location: tournamentData.location,
        table_count: Number.isFinite(Number(tournamentData.table_count))
          ? Number(tournamentData.table_count)
          : 0,
        match_duration: Number.isFinite(Number(tournamentData.match_duration))
          ? Number(tournamentData.match_duration)
          : 0,
        // is_private : si tu veux le piloter ici, sinon on ne l’envoie pas
      };

      const res = await fetch(`/api/admin/tournaments/${idNum}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = t("errorUpdatingTournament") || "Error updating tournament";
        try {
          const errJson = await res.json();
          if (errJson && (errJson.message || errJson.error)) {
            msg += ` (${errJson.message || errJson.error})`;
          }
        } catch (_) {
          // ignore JSON parse errors
        }
        throw new Error(msg);
      }

      let updated = null;
      try {
        updated = await res.json();
      } catch (_) {
        // pas de JSON, ce n'est pas bloquant
      }

      if (updated && typeof updated === "object" && !Array.isArray(updated)) {
        setTournamentData((prev) => ({
          ...prev,
          title: updated.title ?? prev.title,
          email: updated.email ?? prev.email,
          location: updated.location ?? prev.location,
          startDay: updated.startDay ?? updated.startday ?? prev.startDay,
          endDay: updated.endDay ?? updated.endday ?? prev.endDay,
          table_count:
            typeof updated.table_count === "number"
              ? updated.table_count
              : prev.table_count,
          match_duration:
            typeof updated.match_duration === "number"
              ? updated.match_duration
              : prev.match_duration,
        }));
      }

      setSuccessMessage(
        t("successUpdatingTournament") || "Tournament updated successfully"
      );
    } catch (e) {
      console.error("[useAdminTournament] update error:", e);
      setError(
        t("errorUpdatingTournament") || e.message || "Error updating tournament"
      );
    } finally {
      setLoading(false);
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
