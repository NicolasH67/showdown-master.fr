// src/Hooks/useAdminTournament.js
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { get, ApiError } from "../Helpers/apiClient";

/**
 * useAdminTournament
 *
 * Récupère et met à jour un tournoi côté admin **via les routes /api**,
 * sans appel direct à Supabase.
 *
 * Stratégie de fetch :
 *  - Essaye plusieurs endpoints dans l'ordre :
 *      /api/tournaments/:id
 *      /api/tournaments?id=:id
 *  - Le premier qui répond correctement est utilisé.
 *
 * Mise à jour :
 *  - PATCH sur /api/tournaments/:id avec le payload complet `tournamentData`.
 */
const useAdminTournament = (id) => {
  const { t } = useTranslation();

  const [tournamentData, setTournamentData] = useState({
    title: "",
    startDay: "",
    endDay: "",
    mix: false,
    email: "",
    admin_password: "",
    user_password: "",
    ereferee_password: "",
    table_count: 0,
    match_duration: 0,
    location: "",
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
            continue;
          }
        }
        if (errors.length) throw errors[errors.length - 1];
        throw new ApiError("not_found", { status: 404, body: null });
      };

      try {
        const resp = await firstOk([
          `/api/tournaments/${idNum}`,
          `/api/tournaments?id=${idNum}`,
        ]);

        let tournament = null;
        if (Array.isArray(resp)) {
          tournament = resp[0] || null;
        } else if (resp && typeof resp === "object") {
          // cas où la réponse est de la forme { tournament: {...} } ou similaire
          if (resp.tournament) tournament = resp.tournament;
          else tournament = resp;
        }

        if (!cancelled && tournament) {
          setTournamentData((prev) => ({
            ...prev,
            ...tournament,
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
      const res = await fetch(`/api/tournaments/${idNum}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tournamentData),
      });

      if (!res.ok) {
        let msg = t("errorUpdatingTournament") || "Error updating tournament";
        try {
          const errJson = await res.json();
          if (errJson && errJson.message) {
            msg += ` (${errJson.message})`;
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
          ...updated,
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
