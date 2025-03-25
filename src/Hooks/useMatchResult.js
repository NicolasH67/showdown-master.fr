// src/hooks/useMatches.js
import { useEffect, useState } from "react";
import supabase from "../Helpers/supabaseClient";

const useMatchesResult = (tournamentId) => {
  const [matches, setMatches] = useState([]);
  const [referees, setReferees] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatchesAndReferees = async () => {
      try {
        let { data: matchData, error: matchError } = await supabase
          .from("match")
          .select(
            `
            id,
            player1:player1_id(firstname, lastname),
            player2:player2_id(firstname, lastname),
            group:group_id(name),
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

        console.log(matchData);

        matchData.sort((a, b) => {
          const dateA = new Date(`${a.match_date}T${a.match_time}`);
          const dateB = new Date(`${b.match_date}T${b.match_time}`);
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          return a.table_number - b.table_number;
        });
        setMatches(matchData);

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
      }
    }
  };

  return {
    matches,
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
