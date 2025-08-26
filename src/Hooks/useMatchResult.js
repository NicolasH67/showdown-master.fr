// src/hooks/useMatches.js
import { useEffect, useState } from "react";
import supabase from "../Helpers/supabaseClient";

const useMatchesResult = (tournamentId) => {
  const [matches, setMatches] = useState([]);
  const [referees, setReferees] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const fetchMatchesAndReferees = async () => {
      try {
        let { data: matchData, error: matchError } = await supabase
          .from("match")
          .select(
            `
            id,
            player1:player1_id(id, firstname, lastname, club_id),
            player2:player2_id(id, firstname, lastname, club_id),
            player1_group_position,
            player2_group_position,
            group:group_id(id, name, group_former, tournament_id),
            match_day,
            match_time, 
            table_number,
            referee1_id,
            referee2_id,
            result
          `
          )
          .eq("tournament_id", tournamentId);
        if (matchError) throw matchError;

        matchData.sort((a, b) => {
          const dateA = new Date(`${a.match_date}T${a.match_time}`);
          const dateB = new Date(`${b.match_date}T${b.match_time}`);
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          return a.table_number - b.table_number;
        });
        setMatches(matchData);

        let { data: groupData, error: groupError } = await supabase
          .from("group")
          .select("id, name, group_former")
          .eq("tournament_id", tournamentId);
        if (groupError) throw groupError;
        setGroups(groupData);

        // Récupération des arbitres assignés au tournoi
        let { data: refereeData, error: refereeError } = await supabase
          .from("referee")
          .select("id, firstname, lastname")
          .eq("tournament_id", tournamentId);
        if (refereeError) throw refereeError;
        setReferees(refereeData);
      } catch (err) {
        console.error("Erreur lors de la récupération des données :", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchesAndReferees();
  }, [tournamentId]);

  // Mise à jour des données d'un match
  const handleMatchChange = (matchId, field, value) => {
    setMatches((prevMatches) =>
      prevMatches.map((match) =>
        match.id === matchId ? { ...match, [field]: value } : match
      )
    );
  };

  // Mise à jour des résultats pour un match
  const handleResultChange = (matchId, setIndex, player, value) => {
    setResults((prevResults) => ({
      ...prevResults,
      [matchId]: {
        ...prevResults[matchId],
        [player]: {
          ...prevResults[matchId]?.[player],
          [setIndex]: value,
        },
      },
    }));
  };

  // Sauvegarde d'un match (date, heure, table, arbitre)
  const handleSave = async (matchId) => {
    const matchToSave = matches.find((match) => match.id === matchId);
    const { error } = await supabase
      .from("match")
      .update({
        match_day: matchToSave.match_day,
        match_time: matchToSave.match_time,
        table_number: matchToSave.table_number,
        referee1_id: matchToSave.referee1_id || null,
        referee2_id: matchToSave.referee2_id || null,
      })
      .eq("id", matchId);
    if (error) {
      console.error("Erreur lors de l'enregistrement du match :", error);
    } else {
      console.log("Match sauvegardé avec succès.");
    }
  };

  // Soumission des résultats d'un match
  const handleResultSubmit = async (matchId) => {
    const resultData = results[matchId];
    if (resultData) {
      const player1Results = resultData.player1
        ? Object.values(resultData.player1)
        : [];
      const player2Results = resultData.player2
        ? Object.values(resultData.player2)
        : [];
      if (player1Results.length > 5 || player2Results.length > 5) {
        console.error(
          "Erreur : Le nombre de sets dépasse la limite autorisée de 5"
        );
        return;
      }
      const resultArray = [];
      for (
        let i = 0;
        i < Math.max(player1Results.length, player2Results.length);
        i++
      ) {
        const player1Set =
          player1Results[i] !== undefined
            ? parseInt(player1Results[i], 10)
            : null;
        const player2Set =
          player2Results[i] !== undefined
            ? parseInt(player2Results[i], 10)
            : null;
        if (player1Set !== null && player2Set !== null) {
          resultArray.push(player1Set, player2Set);
        }
      }
      console.log(
        "Données envoyées pour le match ID",
        matchId,
        ":",
        resultArray
      );
      const { error } = await supabase
        .from("match")
        .update({ result: resultArray })
        .eq("id", matchId);
      if (error) {
        console.error(
          "Erreur lors de l'enregistrement du résultat du match :",
          error
        );
      } else {
        console.log("Résultat du match enregistré avec succès");
        const match = matches.find((m) => m.id === matchId);
        if (match?.group?.id && match?.group?.tournament_id) {
          await processGroupQualification(
            match.group.id,
            match.group.tournament_id
          );
        }
      }
    }
  };

  const processGroupQualification = async (groupId, tournamentId) => {
    const { data: matches, error: matchError } = await supabase
      .from("match")
      .select("id, result, player1_id, player2_id")
      .eq("group_id", groupId)
      .eq("tournament_id", tournamentId);

    if (matchError) {
      console.error("[processGroupQualification] matchError:", matchError);
      return;
    }

    const groupFinished = matches.every(
      (m) => Array.isArray(m.result) && m.result.length > 0
    );
    if (!groupFinished) return;

    const { data: players, error: playerErr } = await supabase
      .from("player")
      .select("*")
      .contains("group_id", [groupId]);

    if (playerErr) {
      console.error("[processGroupQualification] playerErr:", playerErr);
      return;
    }

    const points = Object.fromEntries(players.map((p) => [p.id, 0]));

    matches.forEach((m) => {
      if (!Array.isArray(m.result) || m.result.length < 2) return;
      const sum1 = m.result
        .filter((_, i) => i % 2 === 0)
        .reduce((a, b) => a + b, 0);
      const sum2 = m.result
        .filter((_, i) => i % 2 === 1)
        .reduce((a, b) => a + b, 0);

      if (sum1 > sum2 && m.player1_id) points[m.player1_id] += 1;
      else if (sum2 > sum1 && m.player2_id) points[m.player2_id] += 1;
    });

    const classement = [...players].sort(
      (a, b) =>
        points[b.id] - points[a.id] || a.lastname.localeCompare(b.lastname)
    );

    const { data: groups, error: groupErr } = await supabase
      .from("group")
      .select("id, group_former")
      .eq("tournament_id", tournamentId);

    if (groupErr) {
      console.error("[processGroupQualification] groupErr:", groupErr);
      return;
    }

    for (const g of groups) {
      if (!g.group_former) continue;

      let former;
      try {
        former = JSON.parse(g.group_former);
      } catch {
        continue;
      }

      const targets = former
        .map((e) => ({ place: e[0], from: e[1] }))
        .filter((e) => e.from === groupId);

      for (const { place } of targets) {
        const player = classement[place - 1];
        if (!player) continue;

        const newGroupId = g.id;
        const updatedGroupArray = player.group_id.includes(newGroupId)
          ? player.group_id
          : [...player.group_id, newGroupId];

        const { error: updErr } = await supabase
          .from("player")
          .update({ group_id: updatedGroupArray })
          .eq("id", player.id);

        if (updErr) {
          console.error("[processGroupQualification] updErr:", updErr);
        }
      }
    }
  };

  return {
    matches,
    groups,
    referees,
    loading,
    error,
    results,
    handleMatchChange,
    handleResultChange,
    handleSave,
    handleResultSubmit,
  };
};

export default useMatchesResult;
