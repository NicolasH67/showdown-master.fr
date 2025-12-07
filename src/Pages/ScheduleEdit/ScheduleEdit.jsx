import React, { useState, useEffect, useMemo } from "react";
import useMatchData from "../../Hooks/useMatchData";
import GroupList from "../../Components/GroupList/GroupList";
import MatchList from "../../Components/MatchList/MatchList";
import matchOrder from "../../Helpers/matchOrder.json";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
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
  const [tableCount, setTableCount] = useState(null);
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(null);

  // 👉 mode auto / manuel
  const [isAutoMode, setIsAutoMode] = useState(true);

  // 👉 lignes de création manuelle
  const [manualMatches, setManualMatches] = useState([]);

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
    if (tournamentStartDate) {
      setDefaultMatchDate((prev) => prev || tournamentStartDate);
    }
  }, [tournamentStartDate]);

  useEffect(() => {
    const fetchTournamentConfig = async () => {
      try {
        const tournamentId = Number(id);
        if (!Number.isFinite(tournamentId) || tournamentId <= 0) return;

        // On privilégie l'endpoint admin pour récupérer toutes les infos
        const urls = [
          `${API_BASE}/api/admin/tournaments/${tournamentId}`,
          `${API_BASE}/api/tournaments/${tournamentId}`,
        ];

        for (const url of urls) {
          try {
            const resp = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            });
            if (!resp.ok) {
              if (resp.status === 404 || resp.status === 405) continue;
              continue;
            }
            const data = await resp.json().catch(() => null);
            if (!data) continue;

            const rawTableCount =
              data.table_count ?? data.tableCount ?? data.tables ?? null;
            const rawMatchDuration =
              data.match_duration ??
              data.matchDuration ??
              data.matchDurationMinutes ??
              null;

            if (rawTableCount != null) {
              const n = Number(rawTableCount);
              if (Number.isFinite(n) && n > 0) {
                setTableCount(n);
              }
            }

            if (rawMatchDuration != null) {
              const m = Number(rawMatchDuration);
              if (Number.isFinite(m) && m > 0) {
                setMatchDurationMinutes(m);
              }
            }
            break;
          } catch (e) {
            console.warn(
              "[ScheduleEdit] fetchTournamentConfig failed for",
              url,
              e
            );
          }
        }
      } catch (e) {
        console.warn("[ScheduleEdit] fetchTournamentConfig error", e);
      }
    };

    fetchTournamentConfig();
  }, [API_BASE, id]);

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

  // ---- Players par groupe ----------------------------------------------------
  const playersByGroup = useMemo(() => {
    if (!players) return {};
    if (!Array.isArray(players) && typeof players === "object") return players;
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
          match_day: day,
          match_time: time,
          table_number: tableNum,
          tournament_id: tournamentId,
          group_id: gId,
          referee1_id: m?.referee1_id ?? null,
          referee2_id: m?.referee2_id ?? null,
        };
      });

      let createdMatches = [];
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
              // ignore
            }
            break;
          }

          if (resp.status !== 404 && resp.status !== 405) {
            const msg = await resp.text().catch(() => "");
            throw new Error(
              t("backendInsertFailed", {
                defaultValue: `Insertion backend échouée (${resp.status}). ${msg}`,
              })
            );
          }
        } catch (e) {
          console.warn(
            `[saveMatches] backend '${url}' failed:`,
            e?.message || e
          );
        }
      }

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

  const renderGeneratedMatchesSection = () => {
    if (!filteredSortedGroups.length) return null;

    return filteredSortedGroups
      .map((g) => {
        const gm = generatedMatches[g.id] || [];
        if (!gm.length) return null;

        const playersForGroup = sortedPlayers[g.id] || [];

        return (
          <div key={g.id} className="mt-3">
            <h3 className="h5">
              {g.name} ({t(g.group_type)})
            </h3>
            <MatchList
              matches={gm}
              players={playersForGroup}
              groupId={g.id}
              updateGeneratedMatch={updateGeneratedMatch}
              saveMatches={saveMatches}
              tournamentStartDate={tournamentStartDate}
            />
          </div>
        );
      })
      .filter(Boolean);
  };

  // ⚠️ NOUVEAU useMemo GLOBAL (pas conditionnel) :
  // Matches existants pour le round sélectionné, aplatis (sans regroupement par groupe)
  const existingMatchesForRound = useMemo(() => {
    if (!matchesState || !filteredSortedGroups.length) return [];

    const safeTs = (m) => {
      const s = `${m?.match_day || ""}T${m?.match_time || ""}`;
      const ts = Date.parse(s);
      return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
    };

    const groupById = new Map(
      filteredSortedGroups.map((g) => [Number(g.id), g])
    );

    const all = [];
    for (const [gidStr, arr] of Object.entries(matchesState || {})) {
      const gid = Number(gidStr);
      if (!groupById.has(gid)) continue; // seulement les groupes du round courant
      const group = groupById.get(gid);
      if (Array.isArray(arr)) {
        for (const m of arr) {
          all.push({
            ...m,
            group,
          });
        }
      }
    }

    all.sort((a, b) => {
      const ta = safeTs(a);
      const tb = safeTs(b);
      if (ta !== tb) return ta - tb;
      const taNum = Number(a?.table_number || 0);
      const tbNum = Number(b?.table_number || 0);
      if (taNum !== tbNum) return taNum - tbNum;
      return Number(a?.id || 0) - Number(b?.id || 0);
    });

    return all;
  }, [matchesState, filteredSortedGroups]);

  // ---------- MODE EDITION / SUPPRESSION EXISTANT (pour les matchs déjà créés) ----------

  if (loading) return <div>{t("loading")}</div>;
  if (error) return <div>{error}</div>;

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

  // ------------ MODE MANUEL : gestion des lignes de création de match ------------

  const handleAddManualRow = () => {
    const firstGroupId =
      filteredSortedGroups.length > 0 ? filteredSortedGroups[0].id : "";

    setManualMatches((prev) => {
      // Point de départ : la dernière ligne manuelle si elle existe,
      // sinon le dernier match existant du tour sélectionné.
      const lastManual = prev.length > 0 ? prev[prev.length - 1] : null;
      const lastExisting =
        !lastManual && existingMatchesForRound.length > 0
          ? existingMatchesForRound[existingMatchesForRound.length - 1]
          : null;

      const baseDate =
        (lastManual && lastManual.match_day) ||
        (lastExisting && lastExisting.match_day) ||
        defaultMatchDate ||
        tournamentStartDate ||
        "";

      // match_time peut être "HH:MM" (manuel) ou "HH:MM:SS" (BDD),
      // on normalise en "HH:MM" pour le champ <input type="time" />
      const rawTime =
        (lastManual && lastManual.match_time) ||
        (lastExisting && lastExisting.match_time) ||
        "";
      let baseTime = "";
      if (typeof rawTime === "string" && rawTime.length > 0) {
        const parts = rawTime.split(":");
        if (parts.length >= 2) {
          baseTime = `${parts[0].padStart(2, "0")}:${parts[1].padStart(
            2,
            "0"
          )}`;
        }
      }

      const rawTable =
        (lastManual && lastManual.table_number) ||
        (lastExisting && lastExisting.table_number) ||
        "";
      const baseTableNum = Number.parseInt(rawTable, 10);
      const currentTable =
        Number.isFinite(baseTableNum) && baseTableNum > 0 ? baseTableNum : 1;

      let nextTable = currentTable;
      let nextTime = baseTime;

      const hasTableCount =
        tableCount != null && Number.isFinite(Number(tableCount));
      const hasDuration =
        matchDurationMinutes != null &&
        Number.isFinite(Number(matchDurationMinutes)) &&
        Number(matchDurationMinutes) > 0;

      if (hasTableCount) {
        const tc = Number(tableCount);
        if (currentTable >= tc) {
          // On revient à la table 1
          nextTable = 1;
          // Et on ajoute la durée du match à l'horaire si possible
          if (hasDuration && baseTime) {
            const [hStr, mStr] = baseTime.split(":");
            const h = Number.parseInt(hStr, 10) || 0;
            const m = Number.parseInt(mStr, 10) || 0;
            const totalMinutes = h * 60 + m + Number(matchDurationMinutes);
            const newH = Math.floor(totalMinutes / 60) % 24;
            const newM = totalMinutes % 60;
            nextTime = `${String(newH).padStart(2, "0")}:${String(
              newM
            ).padStart(2, "0")}`;
          }
        } else {
          // On passe à la table suivante sur le même créneau horaire
          nextTable = currentTable + 1;
        }
      }

      const newRow = {
        match_day: baseDate,
        match_time: nextTime,
        table_number: nextTable || "",
        group_id: firstGroupId || "",
        player1_id: "",
        player2_id: "",
      };

      return [...prev, newRow];
    });
  };

  const handleManualChange = (index, field, value) => {
    setManualMatches((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };

      if (field === "group_id") {
        row.group_id = value;
        row.player1_id = "";
        row.player2_id = "";
      } else {
        row[field] = value;
      }

      copy[index] = row;
      return copy;
    });
  };

  const handleRemoveManualRow = (index) => {
    setManualMatches((prev) => prev.filter((_, i) => i !== index));
  };

  const saveManualMatches = async () => {
    try {
      if (!manualMatches.length) {
        showFeedback(
          t("info", "Info"),
          t("matchesNoValidToSave", {
            defaultValue: "Aucun match manuel à enregistrer.",
          }),
          "info"
        );
        return;
      }

      const tournamentId = Number(id);
      if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
        throw new Error(
          t("tournamentNotFound", { defaultValue: "Tournoi introuvable." })
        );
      }

      const validMatches = manualMatches.map((m, idx) => {
        const day = String(m.match_day || "").trim();
        const time = String(m.match_time || "").trim();
        const tableNum = Number.parseInt(m.table_number, 10);
        const groupIdNum = Number.parseInt(m.group_id, 10);
        const p1Id = Number.parseInt(m.player1_id, 10);
        const p2Id = Number.parseInt(m.player2_id, 10);

        if (
          !day ||
          !time ||
          !Number.isFinite(tableNum) ||
          !Number.isFinite(groupIdNum) ||
          !Number.isFinite(p1Id) ||
          !Number.isFinite(p2Id)
        ) {
          throw new Error(
            t("matchesIncompleteData", {
              defaultValue: `Ligne ${
                idx + 1
              } : données incomplètes (date, heure, table, groupe, joueurs).`,
            })
          );
        }

        return {
          player1_id: p1Id,
          player2_id: p2Id,
          player1_group_position: null,
          player2_group_position: null,
          result: [],
          match_day: day,
          match_time: time,
          table_number: tableNum,
          tournament_id: tournamentId,
          group_id: groupIdNum,
          referee1_id: null,
          referee2_id: null,
        };
      });

      let createdMatches = [];
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
            try {
              const json = await resp.json().catch(() => null);
              if (Array.isArray(json)) {
                createdMatches = json;
              } else if (json && Array.isArray(json.matches)) {
                createdMatches = json.matches;
              }
            } catch {
              // ignore
            }
            break;
          }

          if (resp.status !== 404 && resp.status !== 405) {
            const msg = await resp.text().catch(() => "");
            throw new Error(
              t("backendInsertFailed", {
                defaultValue: `Insertion backend échouée (${resp.status}). ${msg}`,
              })
            );
          }
        } catch (e) {
          console.warn(
            "[saveManualMatches] backend",
            url,
            "failed:",
            e?.message || e
          );
        }
      }

      if (createdMatches && createdMatches.length > 0) {
        setMatchesState((prev) => {
          const next = { ...(prev || {}) };
          for (const m of createdMatches) {
            const gid = m.group_id;
            if (gid == null) continue;
            const existing = Array.isArray(next[gid]) ? next[gid] : [];
            next[gid] = [...existing, m];
          }
          return next;
        });
      }

      showFeedback(
        t("success", "Succès"),
        t("matchesSavedSuccess", {
          defaultValue: "Matchs manuels enregistrés.",
        }),
        "success"
      );
      setManualMatches([]);
    } catch (err) {
      console.error(err);
      showFeedback(
        t("error", "Erreur"),
        err?.message || t("unknownError", { defaultValue: "Erreur inconnue." }),
        "danger"
      );
    }
  };

  const renderManualTable = () => {
    return (
      <div className="mt-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">
            {t("manualSchedule", "Création manuelle des matchs")}
          </h2>
        </div>

        {manualMatches.length === 0 ? (
          <p className="text-muted">
            {t(
              "manualMatchesEmpty",
              'Aucune ligne. Cliquez sur "Ajouter une ligne" pour créer des matchs.'
            )}
          </p>
        ) : (
          <div className="table-responsive mb-4">
            <table className="table table-bordered table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>{t("date", "Date")}</th>
                  <th>{t("time", "Heure")}</th>
                  <th>{t("table", "Table")}</th>
                  <th>{t("group", "Groupe")}</th>
                  <th>{t("player1", "Joueur 1")}</th>
                  <th>{t("player2", "Joueur 2")}</th>
                  <th>{t("action", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {manualMatches.map((row, idx) => {
                  const groupId = row.group_id;
                  const playersInGroup =
                    groupId && sortedPlayers[groupId]
                      ? sortedPlayers[groupId]
                      : [];

                  return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={row.match_day}
                          onChange={(e) =>
                            handleManualChange(idx, "match_day", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className="form-control form-control-sm"
                          value={row.match_time}
                          onChange={(e) =>
                            handleManualChange(
                              idx,
                              "match_time",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control form-control-sm"
                          value={row.table_number}
                          onChange={(e) =>
                            handleManualChange(
                              idx,
                              "table_number",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={row.group_id}
                          onChange={(e) =>
                            handleManualChange(idx, "group_id", e.target.value)
                          }
                        >
                          <option value="">
                            {t("selectGroup", "Choisir un groupe")}
                          </option>
                          {filteredSortedGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({t(g.group_type)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={row.player1_id}
                          onChange={(e) =>
                            handleManualChange(
                              idx,
                              "player1_id",
                              e.target.value
                            )
                          }
                          disabled={!row.group_id}
                        >
                          <option value="">
                            {t("selectPlayer", "Choisir un joueur")}
                          </option>
                          {playersInGroup.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.lastname} {p.firstname}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={row.player2_id}
                          onChange={(e) =>
                            handleManualChange(
                              idx,
                              "player2_id",
                              e.target.value
                            )
                          }
                          disabled={!row.group_id}
                        >
                          <option value="">
                            {t("selectPlayer", "Choisir un joueur")}
                          </option>
                          {playersInGroup.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.lastname} {p.firstname}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveManualRow(idx)}
                        >
                          {t("delete", "Supprimer")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={handleAddManualRow}
          >
            {t("addRow", "Ajouter une ligne")}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-success"
            onClick={saveManualMatches}
            disabled={!manualMatches.length}
          >
            {t("saveManualMatches", "Enregistrer les matchs manuels")}
          </button>
        </div>

        {/* Matchs existants du round sélectionné affichés dans un tableau unique */}
        <h3 className="h6 mb-2">
          {t("existingMatches", "Matchs existants pour ce tour")}
        </h3>
        {existingMatchesForRound.length === 0 ? (
          <p className="text-muted">
            {t(
              "noExistingMatches",
              "Aucun match existant pour ce tour pour le moment."
            )}
          </p>
        ) : (
          <div className="table-responsive mb-4">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th className="text-center">{t("date")}</th>
                  <th className="text-center">{t("time")}</th>
                  <th className="text-center">{t("table")}</th>
                  <th className="text-center">{t("group")}</th>
                  <th className="text-center">{t("player1")}</th>
                  <th className="text-center">{t("player2")}</th>
                  <th className="text-center">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {existingMatchesForRound.map((match) => {
                  // Trouver le groupe de ce match (dans les groupes du tour courant, sinon dans tous les groupes)
                  const group =
                    (filteredSortedGroups || []).find(
                      (g) =>
                        Number(g.id) === Number(match.group_id) ||
                        Number(g.id) === Number(match.group?.id)
                    ) ||
                    (groups || []).find(
                      (g) =>
                        Number(g.id) === Number(match.group_id) ||
                        Number(g.id) === Number(match.group?.id)
                    ) ||
                    null;

                  const groupName = group ? group.name : t("group");

                  // Joueurs pour ce groupe
                  const groupPlayers = group
                    ? sortedPlayers[group.id] || []
                    : [];

                  const p1Id = match?.player1_id ?? match?.player1?.id ?? null;
                  const p2Id = match?.player2_id ?? match?.player2?.id ?? null;

                  const player1 = groupPlayers.find((p) => p.id === p1Id);
                  const player2 = groupPlayers.find((p) => p.id === p2Id);

                  const fallbackFromFormer = (pos) => {
                    if (!group || !group.group_former) return t("notAssigned");
                    let parsed;
                    if (Array.isArray(group.group_former)) {
                      parsed = group.group_former;
                    } else {
                      try {
                        parsed = JSON.parse(group.group_former);
                      } catch {
                        return t("notAssigned");
                      }
                    }
                    if (!Array.isArray(parsed)) return t("notAssigned");
                    const entry = parsed[(Number(pos) || 0) - 1];
                    if (!entry) return t("notAssigned");
                    const [position, refGroupId] = entry;
                    const ref =
                      (groups || []).find(
                        (gg) => Number(gg.id) === Number(refGroupId)
                      ) || null;
                    return ref
                      ? `${ref.name}(${position})`
                      : `${t("group")} ${refGroupId}(${position})`;
                  };

                  const displayTime =
                    match.match_time && match.match_day
                      ? new Date(
                          `${match.match_day}T${match.match_time}`
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--";

                  return (
                    <tr key={match.id}>
                      <td className="text-center">{match.match_day}</td>
                      <td className="text-center">{displayTime}</td>
                      <td className="text-center">{match.table_number}</td>
                      <td className="text-center">{groupName}</td>
                      <td className="text-center">
                        {player1
                          ? `${player1.lastname} ${player1.firstname}`
                          : fallbackFromFormer(match.player1_group_position)}
                      </td>
                      <td className="text-center">
                        {player2
                          ? `${player2.lastname} ${player2.firstname}`
                          : fallbackFromFormer(match.player2_group_position)}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => handleEditMatch(match)}
                        >
                          {t("edit")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteMatch(match)}
                        >
                          {t("delete")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

        {/* Switch Auto / Manuel */}
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="scheduleModeSwitch"
            checked={isAutoMode}
            onChange={(e) => setIsAutoMode(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="scheduleModeSwitch">
            {isAutoMode
              ? t("autoSchedule", "Création automatique des matchs")
              : t("manualSchedule", "Création manuelle des matchs")}
          </label>
        </div>

        <RoundSelector
          selectedRound={selectedRound}
          setSelectedRound={setSelectedRound}
        />

        {isAutoMode ? (
          <>
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
            {renderGeneratedMatchesSection()}
          </>
        ) : (
          renderManualTable()
        )}
      </div>
    </>
  );
};

export default ScheduleEdit;
