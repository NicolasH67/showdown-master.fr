import React, { useState, useEffect, useMemo } from "react";
import useMatchData from "../../Hooks/useMatchData";
import GroupList from "../../Components/GroupList/GroupList";
import matchOrder from "../../Helpers/matchOrder.json";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
import supabase from "../../Helpers/supabaseClient";
import { useParams, useLocation } from "react-router-dom";
import useTournamentStartDate from "../../Hooks/useTournamentStartDate";
import { useTranslation } from "react-i18next";

const ScheduleEdit = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { id } = useParams();
  const { groups, players, matches, clubs, loading, error } = useMatchData();
  const [matchesState, setMatchesState] = useState(matches || {});
  const [generatedMatches, setGeneratedMatches] = useState({});
  const [selectedRound, setSelectedRound] = useState("1st round");
  const tournamentStartDate = useTournamentStartDate(id);
  const [defaultMatchDate, setDefaultMatchDate] = useState(
    tournamentStartDate || ""
  );
  const [editingMatch, setEditingMatch] = useState(null);
  const [editForm, setEditForm] = useState({
    match_day: "",
    match_time: "",
    table_number: "",
  });
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    variant: "info",
  });
  const [matchToDelete, setMatchToDelete] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || "";

  useEffect(() => {
    if (groups.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, groups.length]);

  useEffect(() => {
    setMatchesState(matches || {});
  }, [matches]);

  useEffect(() => {
    // Initialise ou réinitialise la date par défaut quand
    // la date de début du tournoi change.
    if (tournamentStartDate) {
      setDefaultMatchDate((prev) => prev || tournamentStartDate);
    }
  }, [tournamentStartDate]);

  const showFeedback = (title, message, variant = "info") => {
    setFeedbackModal({
      open: true,
      title,
      message,
      variant,
    });
  };

  const closeFeedback = () => {
    setFeedbackModal((prev) => ({ ...prev, open: false }));
  };

  // Normaliser les joueurs en dictionnaire { group_id: Player[] }
  const playersByGroup = useMemo(() => {
    if (!players) return {};
    // Si c'est déjà un objet {groupId: [...]} on le retourne tel quel
    if (!Array.isArray(players) && typeof players === "object") return players;
    // Si c'est un tableau, on groupe par group_id
    if (Array.isArray(players)) {
      return players.reduce((acc, p) => {
        const gid = Array.isArray(p.group_id) ? p.group_id[0] : p.group_id;
        if (gid == null) return acc;
        if (!acc[gid]) acc[gid] = [];
        acc[gid].push(p);
        return acc;
      }, {});
    }
    return {};
  }, [players]);

  const sortedPlayers = useMemo(() => {
    return Object.fromEntries(
      Object.entries(playersByGroup).map(([groupId, groupPlayers]) => [
        groupId,
        [...groupPlayers].sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0)),
      ])
    );
  }, [playersByGroup]);

  const generateMatches = (groupId) => {
    const group = groups.find((g) => g.id === groupId);
    const groupPlayers = sortedPlayers[groupId] || [];

    // sécuriser le parsing de group_former
    let groupFormer = [];
    if (group && group.group_former) {
      if (Array.isArray(group.group_former)) {
        groupFormer = group.group_former;
      } else {
        try {
          groupFormer = JSON.parse(group.group_former) || [];
        } catch {
          groupFormer = [];
        }
      }
    }

    const total = groupPlayers.length + groupFormer.length;
    if (total < 2) {
      showFeedback(
        t("error", "Erreur"),
        t("needAtLeastTwoPlayers", {
          defaultValue: "Il faut au moins 2 joueurs.",
        }),
        "danger"
      );
      return;
    }

    // Choix de l'ordre en fonction du nombre total de participants (réels + placeholders)
    const order = matchOrder?.["Match Order"]?.[total];
    if (!order) {
      showFeedback(
        t("error", "Erreur"),
        t("noMatchOrder", { defaultValue: "Aucun ordre de match défini." }),
        "danger"
      );
      return;
    }

    const rows = order.map((matchStr) => {
      const [p1, p2] = String(matchStr)
        .split("-")
        .map((n) => parseInt(n, 10));
      const player1 = groupPlayers[p1 - 1];
      const player2 = groupPlayers[p2 - 1];
      return {
        player1_id: player1 ? player1.id : null,
        player1_group_position: player1 ? null : p1,
        player2_id: player2 ? player2.id : null,
        player2_group_position: player2 ? null : p2,
        match_date: defaultMatchDate || tournamentStartDate || "",
        match_time: "",
        table_number: "",
      };
    });

    setGeneratedMatches((prev) => ({ ...prev, [groupId]: rows }));
  };

  const updateGeneratedMatch = (groupId, matchIndex, field, value) => {
    // Si l'utilisateur change la date d'un match généré,
    // on met à jour la "date par défaut" pour les prochains matches.
    if (field === "match_date" && value) {
      setDefaultMatchDate(value);
    }

    setGeneratedMatches((prev) => {
      const updatedMatches = { ...prev };

      if (!updatedMatches[groupId]) {
        return prev;
      }

      const matchesCopy = [...updatedMatches[groupId]];

      matchesCopy[matchIndex] = {
        ...matchesCopy[matchIndex],
        [field]: value,
      };

      updatedMatches[groupId] = matchesCopy;
      return updatedMatches;
    });
  };

  const saveMatches = async (groupId) => {
    try {
      const matches = generatedMatches[groupId];

      if (!Array.isArray(matches) || matches.length === 0) {
        showFeedback(
          t("info", "Info"),
          t("matchesNoValidToSave", {
            defaultValue: "Aucun match à enregistrer.",
          }),
          "info"
        );
        return;
      }

      // Valide les identifiants de contexte uniquement côté client
      const tournamentId = Number(id);
      if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
        throw new Error(
          t("tournamentNotFound", { defaultValue: "Tournoi introuvable." })
        );
      }
      const gId = Number(groupId);
      if (!Number.isFinite(gId) || gId <= 0) {
        throw new Error(
          t("groupNotFound", { defaultValue: "Groupe introuvable." })
        );
      }

      // Validation et normalisation des matches
      const validMatches = matches.map((m, idx) => {
        const p1Id = m?.player1_id ?? null;
        const p2Id = m?.player2_id ?? null;
        const p1Pos = p1Id ? null : m?.player1_group_position ?? null;
        const p2Pos = p2Id ? null : m?.player2_group_position ?? null;
        const day = String(m?.match_date || "").trim();
        const time = String(m?.match_time || "").trim();
        const tableNum = Number.parseInt(m?.table_number, 10);

        if (
          (!p1Id && !p1Pos) ||
          (!p2Id && !p2Pos) ||
          !day ||
          !time ||
          !Number.isFinite(tableNum)
        ) {
          throw new Error(
            t("matchesIncompleteData", {
              defaultValue: `Ligne ${
                idx + 1
              } : données incomplètes (joueurs/placeholders/date/heure/table).`,
            })
          );
        }

        return {
          player1_id: p1Id,
          player2_id: p2Id,
          player1_group_position: p1Pos,
          player2_group_position: p2Pos,
          result: Array.isArray(m?.result) ? m.result : [],
          match_day: day, // YYYY-MM-DD
          match_time: time, // HH:mm
          table_number: tableNum,
          tournament_id: tournamentId,
          group_id: gId,
          referee1_id: m?.referee1_id ?? null,
          referee2_id: m?.referee2_id ?? null,
        };
      });

      let createdMatches = [];
      // 1) Tente d'abord les routes backend (bypass RLS). Deux variantes possibles.
      let backendOk = false;
      const backends = [
        `${API_BASE}/api/tournaments/${tournamentId}/matches`,
        `${API_BASE}/api/tournaments/matches?id=${tournamentId}`,
      ];

      for (const url of backends) {
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ matches: validMatches }),
          });

          if (resp.ok) {
            backendOk = true;
            try {
              const json = await resp.json().catch(() => null);
              if (Array.isArray(json)) {
                createdMatches = json;
              } else if (json && Array.isArray(json.matches)) {
                createdMatches = json.matches;
              }
            } catch {
              // si la route ne renvoie rien ou pas de JSON, on laissera createdMatches vide
            }
            break;
          }

          // Si la route existe mais renvoie autre chose que 404/405, on arrête et on surface l'erreur
          if (resp.status !== 404 && resp.status !== 405) {
            const msg = await resp.text().catch(() => "");
            throw new Error(
              t("backendInsertFailed", {
                defaultValue: `Insertion backend échouée (${resp.status}). ${msg}`,
              })
            );
          }
        } catch (e) {
          // continue vers le backend suivant, puis fallback Supabase
          console.warn(
            `[saveMatches] backend '${url}' failed:`,
            e?.message || e
          );
        }
      }

      // if (!backendOk) {
      //   const { data, error } = await supabase
      //     .from("match")
      //     .insert(validMatches)
      //     .select();
      //   if (error) {
      //     if (
      //       error?.code === "PGRST301" ||
      //       /permission|RLS/i.test(error?.message || "")
      //     ) {
      //       throw new Error(
      //         t("rlsRejectInsert", {
      //           defaultValue:
      //             "Insertion refusée par les règles de sécurité (RLS). Connectez‑vous en admin ou activez la route backend /api/tournaments/:id/matches.",
      //         })
      //       );
      //     }
      //     throw new Error(error.message || "insert_failed");
      //   }
      //   if (Array.isArray(data)) {
      //     createdMatches = data;
      //   }
      // }

      // Mise à jour locale des matchs existants pour ce groupe sans recharger la page
      if (createdMatches && createdMatches.length > 0) {
        setMatchesState((prev) => {
          const next = { ...(prev || {}) };
          const key = gId;
          const existingForGroup = Array.isArray(next[key]) ? next[key] : [];
          next[key] = [...existingForGroup, ...createdMatches];
          return next;
        });
      }

      showFeedback(
        t("success", "Succès"),
        t("matchesSavedSuccess", { defaultValue: "Matchs enregistrés." }),
        "success"
      );
      setGeneratedMatches((prev) => ({ ...prev, [groupId]: [] }));
    } catch (error) {
      console.error(error);
      showFeedback(
        t("error", "Erreur"),
        error?.message ||
          t("unknownError", { defaultValue: "Erreur inconnue." }),
        "danger"
      );
    }
  };

  const filteredSortedGroups = useMemo(() => {
    const arr = Array.isArray(groups) ? groups : [];
    return arr
      .filter((g) => (g?.round_type || "") === selectedRound)
      .sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
  }, [groups, selectedRound]);

  if (loading) return <div>{t("loading")}</div>;
  if (error) return <div>{error}</div>;

  // Handlers for editing and deleting matches
  const handleEditMatch = (match) => {
    const currentDate = match.match_day || tournamentStartDate || "";
    const currentTime = match.match_time || "";
    const currentTable = match.table_number || "";

    setEditingMatch(match);
    setEditForm({
      match_day: currentDate,
      match_time: currentTime,
      table_number: String(currentTable || ""),
    });
  };
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "match_day" && value) {
      // si on change la date dans le popup d'édition,
      // on met à jour la date par défaut pour les futurs matchs générés
      setDefaultMatchDate(value);
    }
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFormCancel = () => {
    setEditingMatch(null);
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    if (!editingMatch) return;

    const newDate = editForm.match_day || "";
    const newTime = editForm.match_time || "";
    const tableNum = Number.parseInt(editForm.table_number, 10);

    if (!newDate || !newTime || !Number.isFinite(tableNum)) {
      showFeedback(
        t("error", "Erreur"),
        t(
          "editMatchInvalidForm",
          "Veuillez remplir une date, une heure et un numéro de table valides."
        ),
        "danger"
      );
      return;
    }

    try {
      const resp = await fetch(
        `${API_BASE}/api/admin/matches/${editingMatch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            match_day: newDate,
            match_time: newTime,
            table_number: tableNum,
          }),
        }
      );

      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        console.error("Erreur édition match", resp.status, msg);
        showFeedback(
          t("error", "Erreur"),
          t(
            "editMatchError",
            "Erreur lors de la modification du match. Vérifiez vos droits administrateur."
          ),
          "danger"
        );
        return;
      }

      // Mise à jour locale du match sans recharger la page
      setMatchesState((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        let groupKey = editingMatch.group_id;

        if (groupKey == null) {
          for (const [gid, arr] of Object.entries(next)) {
            if (
              Array.isArray(arr) &&
              arr.some((m) => m.id === editingMatch.id)
            ) {
              groupKey = Number(gid);
              break;
            }
          }
        }

        if (groupKey == null || !next[groupKey]) return prev;

        next[groupKey] = next[groupKey].map((m) =>
          m.id === editingMatch.id
            ? {
                ...m,
                match_day: newDate,
                match_time: newTime,
                table_number: tableNum,
              }
            : m
        );

        return next;
      });

      showFeedback(
        t("success", "Succès"),
        t("matchUpdated", "Match mis à jour."),
        "success"
      );
      setEditingMatch(null);
    } catch (err) {
      console.error("Erreur réseau lors de la modification du match", err);
      showFeedback(
        t("error", "Erreur"),
        t(
          "editMatchErrorNetwork",
          "Erreur réseau lors de la modification du match."
        ),
        "danger"
      );
    }
  };

  // Ouverture du modal de confirmation de suppression
  const handleDeleteMatch = (match) => {
    setMatchToDelete(match);
  };

  const confirmDeleteMatch = async () => {
    if (!matchToDelete) return;
    const match = matchToDelete;

    try {
      const resp = await fetch(`${API_BASE}/api/admin/matches/${match.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        console.error("Erreur suppression match", resp.status, msg);
        showFeedback(
          t("error", "Erreur"),
          t(
            "deleteError",
            "Erreur lors de la suppression du match. Vérifiez vos droits administrateur."
          ),
          "danger"
        );
        return;
      }

      // Mise à jour locale: on enlève le match supprimé sans recharger
      setMatchesState((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        let groupKey = match.group_id;

        if (groupKey == null) {
          for (const [gid, arr] of Object.entries(next)) {
            if (Array.isArray(arr) && arr.some((m) => m.id === match.id)) {
              groupKey = Number(gid);
              break;
            }
          }
        }

        if (groupKey == null || !next[groupKey]) return prev;

        next[groupKey] = next[groupKey].filter((m) => m.id !== match.id);
        return next;
      });

      showFeedback(
        t("success", "Succès"),
        t("matchDeleted", "Match supprimé."),
        "success"
      );
    } catch (e) {
      console.error("Erreur réseau lors de la suppression du match", e);
      showFeedback(
        t("error", "Erreur"),
        t(
          "deleteErrorNetwork",
          "Erreur réseau lors de la suppression du match."
        ),
        "danger"
      );
    } finally {
      setMatchToDelete(null);
    }
  };

  const cancelDeleteMatch = () => {
    setMatchToDelete(null);
  };

  const getFakePlayerLabel = (group, position) => {
    if (!group?.group_former) return "";
    let arr = [];
    if (Array.isArray(group.group_former)) arr = group.group_former;
    else {
      try {
        arr = JSON.parse(group.group_former) || [];
      } catch {
        arr = [];
      }
    }
    return arr[position - 1] || `(${position})`;
  };

  const renderDeleteModal = () => {
    if (!matchToDelete) return null;
    return (
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 1050,
        }}
      >
        <div className="card shadow" style={{ maxWidth: 400, width: "100%" }}>
          <div className="card-header">
            <strong>
              {t(
                "confirmDeleteMatch",
                "Voulez-vous vraiment supprimer ce match ?"
              )}
            </strong>
          </div>
          <div className="card-body">
            <p className="mb-3">
              {t(
                "deleteMatchWarning",
                "Cette action est définitive et supprimera le match de la planification."
              )}
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelDeleteMatch}
              >
                {t("cancel", "Annuler")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteMatch}
              >
                {t("delete", "Supprimer")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editingMatch) return null;
    return (
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 1050,
        }}
      >
        <div className="card shadow" style={{ maxWidth: 400, width: "100%" }}>
          <div className="card-header">
            <strong>{t("editMatch", "Modifier le match")}</strong>
          </div>
          <div className="card-body">
            <form onSubmit={handleEditFormSubmit}>
              <div className="mb-3">
                <label className="form-label">
                  {t("date", "Date")}
                  <input
                    type="date"
                    name="match_day"
                    className="form-control"
                    value={editForm.match_day}
                    onChange={handleEditFormChange}
                  />
                </label>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  {t("time", "Heure")}
                  <input
                    type="time"
                    name="match_time"
                    className="form-control"
                    value={editForm.match_time}
                    onChange={handleEditFormChange}
                  />
                </label>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  {t("table", "Table")}
                  <input
                    type="number"
                    name="table_number"
                    className="form-control"
                    value={editForm.table_number}
                    onChange={handleEditFormChange}
                    min="1"
                  />
                </label>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleEditFormCancel}
                >
                  {t("cancel", "Annuler")}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t("save", "Enregistrer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderFeedbackModal = () => {
    if (!feedbackModal.open) return null;
    return (
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
      >
        <div className="card shadow" style={{ maxWidth: 420, width: "100%" }}>
          <div className="card-header">
            <strong>{feedbackModal.title}</strong>
          </div>
          <div className="card-body">
            <p className="mb-3">{feedbackModal.message}</p>
            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={closeFeedback}
              >
                {t("ok", "OK")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderFeedbackModal()}
      {renderEditModal()}
      {renderDeleteModal()}
      <div>
        <h1 id="page-title" tabIndex="-1">
          {t("scheduleEdit")}
        </h1>
        <RoundSelector
          selectedRound={selectedRound}
          setSelectedRound={setSelectedRound}
        />
        <GroupList
          groups={filteredSortedGroups}
          players={sortedPlayers}
          clubs={clubs}
          matches={matchesState}
          generateMatches={generateMatches}
          generatedMatches={generatedMatches}
          updateGeneratedMatch={updateGeneratedMatch}
          saveMatches={saveMatches}
          allGroups={groups}
          onEditMatch={handleEditMatch}
          onDeleteMatch={handleDeleteMatch}
          getFakePlayerLabel={getFakePlayerLabel}
          tournamentStartDate={tournamentStartDate}
        />
      </div>
    </>
  );
};

export default ScheduleEdit;
