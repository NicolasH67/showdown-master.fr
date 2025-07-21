import React, { useState, useEffect } from "react";
import useMatchData from "../../Hooks/useMatchData";
import GroupList from "../../Components/GroupList/GroupList";
import matchOrder from "../../Helpers/matchOrder.json";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
import supabase from "../../Helpers/supabaseClient";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMatch } from "react-router-dom";

const ScheduleEdit = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { id } = useParams();
  const { groups, players, matches, clubs, loading, error } = useMatchData();
  const [generatedMatches, setGeneratedMatches] = useState({});
  const [selectedRound, setSelectedRound] = useState("1st round");

  useEffect(() => {
    if (groups.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, groups.length]);

  // Trier les joueurs par leur identifiant dans chaque groupe
  const sortedPlayers = Object.fromEntries(
    Object.entries(players).map(([groupId, groupPlayers]) => [
      groupId,
      [...groupPlayers].sort((a, b) => a.id - b.id),
    ])
  );

  const generateMatches = (groupId) => {
    const groupPlayers = sortedPlayers[groupId] || [];
    const group = groups.find((g) => g.id === groupId);
    const fakeGroupPlayer = group.group_former;

    if (groupPlayers.length < 2 && (fakeGroupPlayer == [] || null)) {
      alert("Il faut au moins 2 joueurs.");
    }

    if (groupPlayers.length > 2) {
      const matchOrderForGroup = matchOrder["Match Order"][groupPlayers.length];
      if (!matchOrderForGroup) return alert("Aucun ordre de match défini.");

      setGeneratedMatches((prev) => ({
        ...prev,
        [groupId]: matchOrderForGroup.map((matchStr) => {
          const [p1, p2] = matchStr.split("-").map(Number);
          return {
            player1_id: groupPlayers[p1 - 1]?.id,
            player2_id: groupPlayers[p2 - 1]?.id,
          };
        }),
      }));
    } else {
      try {
        const parsedGroupFormer = Array.isArray(group.group_former)
          ? group.group_former
          : JSON.parse(group.group_former);
        const matchOrderForGroup =
          matchOrder["Match Order"][parsedGroupFormer.length];
        if (!matchOrderForGroup) return alert("Aucun ordre de match défini.");

        setGeneratedMatches((prev) => ({
          ...prev,
          [groupId]: matchOrderForGroup.map((matchStr) => {
            const [p1, p2] = matchStr.split("-").map(Number);
            return {
              player1_id: groupPlayers[p1 - 1]?.id,
              player2_id: groupPlayers[p2 - 1]?.id,
            };
          }),
        }));
      } catch (error) {
        console.log(error);
      }
    }
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
        if (
          !match.player1_id ||
          !match.player2_id ||
          !match.match_date ||
          !match.match_time ||
          !match.table_number
        ) {
          throw new Error(t("matchesIncompleteData"));
        }

        return {
          player1_id: match.player1_id,
          player2_id: match.player2_id,
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

  const filteredSortedGroups = groups
    .filter((g) => g.round_type === selectedRound)
    .sort((a, b) => a.id - b.id);

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
      />
    </div>
  );
};

export default ScheduleEdit;
