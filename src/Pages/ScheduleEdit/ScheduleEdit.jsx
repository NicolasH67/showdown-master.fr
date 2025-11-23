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
  const [generatedMatches, setGeneratedMatches] = useState({});
  const [selectedRound, setSelectedRound] = useState("1st round");
  const tournamentStartDate = useTournamentStartDate(id);

  useEffect(() => {
    if (groups.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, groups.length]);

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
      alert(
        t("needAtLeastTwoPlayers", {
          defaultValue: "Il faut au moins 2 joueurs.",
        })
      );
      return;
    }

    // Choix de l'ordre en fonction du nombre total de participants (réels + placeholders)
    const order = matchOrder?.["Match Order"]?.[total];
    if (!order) {
      alert(
        t("noMatchOrder", { defaultValue: "Aucun ordre de match défini." })
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
        match_date: tournamentStartDate || "",
        match_time: "",
        table_number: "",
      };
    });

    setGeneratedMatches((prev) => ({ ...prev, [groupId]: rows }));
  };

  const updateGeneratedMatch = (groupId, matchIndex, field, value) => {
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
        alert(
          t("matchesNoValidToSave", {
            defaultValue: "Aucun match à enregistrer.",
          })
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

      // 1) Tente d'abord les routes backend (bypass RLS). Deux variantes possibles.
      let backendOk = false;
      const backends = [
        `/api/tournaments/${tournamentId}/matches`,
        `/api/tournaments/matches?id=${tournamentId}`,
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

      // 2) Fallback direct Supabase si aucune route backend n'a fonctionné
      if (!backendOk) {
        const { error } = await supabase.from("match").insert(validMatches);
        if (error) {
          if (
            error?.code === "PGRST301" ||
            /permission|RLS/i.test(error?.message || "")
          ) {
            throw new Error(
              t("rlsRejectInsert", {
                defaultValue:
                  "Insertion refusée par les règles de sécurité (RLS). Connectez‑vous en admin ou activez la route backend /api/tournaments/:id/matches.",
              })
            );
          }
          throw new Error(error.message || "insert_failed");
        }
      }

      alert(t("matchesSavedSuccess", { defaultValue: "Matchs enregistrés." }));
      setGeneratedMatches((prev) => ({ ...prev, [groupId]: [] }));
    } catch (error) {
      console.error(error);
      alert(
        error?.message ||
          t("unknownError", { defaultValue: "Erreur inconnue." })
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
    alert(`${t("edit")} - ID: ${match.id}`);
  };

  const handleDeleteMatch = async (match) => {
    const confirmed = window.confirm(`${t("confirmDeleteMatch")}`);
    if (!confirmed) return;

    const { error } = await supabase.from("match").delete().eq("id", match.id);
    if (error) {
      console.error(error.message);
      alert(t("deleteError"));
      return;
    }

    alert(t("matchDeleted"));
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

  return (
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
        matches={matches}
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
  );
};

export default ScheduleEdit;
