import React, { useState, useEffect, useMemo } from "react";
import useMatchData from "../../Hooks/useMatchData";
import GroupList from "../../Components/GroupList/GroupList";
import matchOrder from "../../Helpers/matchOrder.json";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
import supabase from "../../Helpers/supabaseClient";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const ScheduleEdit = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { id } = useParams();
  const { groups, players, matches, clubs, loading, error } = useMatchData();
  const [generatedMatches, setGeneratedMatches] = useState({});
  const [selectedRound, setSelectedRound] = useState("1st round");
  const [tournamentStartDate, setTournamentStartDate] = useState("");

  useEffect(() => {
    if (groups.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, groups.length]);

  useEffect(() => {
    const fetchTournamentStartDate = async () => {
      const { data, error } = await supabase
        .from("tournament")
        .select("startday")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(
          "Erreur de récupération de la date de début :",
          error.message
        );
      } else if (data && data.startday) {
        setTournamentStartDate(data.startday);
      } else {
        // pas de ligne pour cet id; garder la valeur par défaut
        console.warn("Aucune date de début trouvée pour le tournoi", id);
      }
    };

    if (id) {
      fetchTournamentStartDate();
    }
  }, [id]);

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

      if (!matches || matches.length === 0) {
        alert(t("matchesNoValidToSave"));
        return;
      }

      const tournamentId = id;
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournament")
        .select("id")
        .eq("id", tournamentId)
        .single();

      if (tournamentError || !tournament) {
        throw new Error(t("tournamentNotFound"));
      }

      const validMatches = matches.map((match) => {
        console.log(match);
        if (
          (!match.player1_id && !match.player1_group_position) ||
          (!match.player2_id && !match.player2_group_position) ||
          !match.match_date ||
          !match.match_time ||
          !match.table_number
        ) {
          throw new Error(t("matchesIncompleteData"));
        }

        return {
          player1_id: match.player1_id ?? null,
          player2_id: match.player2_id ?? null,
          player1_group_position: match.player1_id
            ? null
            : match.player1_group_position ?? null,
          player2_group_position: match.player2_id
            ? null
            : match.player2_group_position ?? null,
          result: [],
          match_day: match.match_date,
          match_time: match.match_time,
          table_number: parseInt(match.table_number, 10),
          tournament_id: tournamentId,
          group_id: groupId,
          referee1_id: null,
          referee2_id: null,
        };
      });

      const { error } = await supabase.from("match").insert(validMatches);
      if (error) {
        console.error(error);
        throw new Error(error.message);
      }

      alert(t("matchesSavedSuccess"));
      setGeneratedMatches((prev) => ({ ...prev, [groupId]: [] }));
    } catch (error) {
      console.error(error.message);
      alert(error.message);
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
