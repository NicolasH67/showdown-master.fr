import React, { useState } from "react";
import useMatchData from "../../Hooks/useMatchData";
import GroupList from "../../Components/GroupList/GroupList";
import matchOrder from "../../Helpers/matchOrder.json";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
import supabase from "../../Helpers/supabaseClient";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const ScheduleEdit = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { groups, players, clubs, loading, error } = useMatchData();
  const [generatedMatches, setGeneratedMatches] = useState({});
  const [selectedRound, setSelectedRound] = useState("1st round");

  /**
   * Generates matches for a specific group based on the players in that group.
   * @param {string} groupId - The ID of the group for which to generate matches.
   */
  const generateMatches = (groupId) => {
    const groupPlayers = players[groupId] || [];
    if (groupPlayers.length < 2) return alert("Il faut au moins 2 joueurs.");

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
  };

  /**
   * Updates a specific match in the generated matches.
   * @param {string} groupId - The ID of the group containing the match.
   * @param {number} matchIndex - The index of the match to update.
   * @param {string} field - The field of the match to update.
   * @param {any} value - The new value for the specified field.
   */
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

  /**
   * Saves the generated matches for a specific group to the database.
   * @param {string} groupId - The ID of the group whose matches are to be saved.
   */
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

  return (
    <div>
      <h1>{t("groups")}</h1>
      <RoundSelector
        selectedRound={selectedRound}
        setSelectedRound={setSelectedRound}
      />
      <GroupList
        groups={filteredSortedGroups}
        players={players}
        clubs={clubs}
        generateMatches={generateMatches}
        generatedMatches={generatedMatches}
        updateGeneratedMatch={updateGeneratedMatch}
        saveMatches={saveMatches}
      />
    </div>
  );
};

export default ScheduleEdit;
