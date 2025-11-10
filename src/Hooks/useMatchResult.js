// src/Hooks/useMatchResult.js
// Hook de gestion des matchs (récupération, édition et sauvegarde des résultats)
import { useEffect, useRef, useState } from "react";
import supabase from "../Helpers/supabaseClient";
import usePlayers from "./usePlayers";
import useMatches from "./useMatchs";
import useGroupsData from "./useGroupsData";
import useReferees from "./useReferee"; // garde le même chemin que dans le projet

const MAX_SETS = 5; // sécurité côté UI

const useMatchesResult = (tournamentId) => {
  const [matches, setMatches] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // données issues des hooks centralisés
  const {
    matches: hookMatches = [],
    loading: matchesLoading = false,
    error: matchesError = null,
    refresh: refreshMatches,
  } = useMatches(tournamentId);

  const {
    groups: hookGroups = [],
    loading: groupsLoading = false,
    error: groupsError = null,
  } = useGroupsData(tournamentId);

  const {
    referees: hookReferees = [],
    loading: refsLoading = false,
    error: refsError = null,
  } = useReferees(tournamentId);

  // évite les setState après un unmount
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Synchronise les données issues des hooks vers l'état local (édition locale possible)
  useEffect(() => {
    // état de chargement global
    const compositeLoading = matchesLoading || groupsLoading || refsLoading;
    setLoading(compositeLoading);

    // première erreur disponible
    setError(matchesError || groupsError || refsError || null);

    if (!compositeLoading) {
      // copie éditable des matchs
      setMatches(Array.isArray(hookMatches) ? hookMatches : []);
    }
  }, [
    matchesLoading,
    groupsLoading,
    refsLoading,
    hookMatches,
    matchesError,
    groupsError,
    refsError,
  ]);

  // expose des valeurs dérivées depuis les hooks
  const groups = Array.isArray(hookGroups) ? hookGroups : [];
  const referees = Array.isArray(hookReferees) ? hookReferees : [];

  // Mise à jour des champs d'un match (date, heure, table, arbitres)
  const handleMatchChange = (matchId, field, value) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, [field]: value } : m))
    );
  };

  // Mise à jour des scores locaux avant soumission
  const handleResultChange = (matchId, setIndex, player, value) => {
    const cleanVal = value === "" ? "" : String(value).replace(/\D/g, "");
    setResults((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [player]: {
          ...prev[matchId]?.[player],
          [setIndex]: cleanVal,
        },
      },
    }));
  };

  // Sauvegarde d'un match (métadonnées)
  const handleSave = async (matchId) => {
    const matchToSave = matches.find((m) => m.id === matchId);
    if (!matchToSave) return;

    // normalisation
    const payload = {
      match_day: matchToSave.match_day || null,
      match_time: matchToSave.match_time || null,
      table_number: matchToSave.table_number
        ? parseInt(matchToSave.table_number, 10)
        : null,
      referee1_id: matchToSave.referee1_id || null,
      referee2_id: matchToSave.referee2_id || null,
    };

    const { error: updErr } = await supabase
      .from("match")
      .update(payload)
      .eq("id", matchId);

    if (updErr) {
      console.error("[useMatchesResult] save meta error:", updErr);
      throw updErr;
    }
  };

  // Construction du tableau de scores [p1s1, p2s1, p1s2, p2s2, ...]
  function buildResultArray(local) {
    const p1 = local?.player1 ? Object.values(local.player1) : [];
    const p2 = local?.player2 ? Object.values(local.player2) : [];

    if (p1.length > MAX_SETS || p2.length > MAX_SETS) {
      throw new Error(`Too many sets (max ${MAX_SETS})`);
    }

    const arr = [];
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const s1 = p1[i] === "" || p1[i] == null ? null : parseInt(p1[i], 10);
      const s2 = p2[i] === "" || p2[i] == null ? null : parseInt(p2[i], 10);
      if (Number.isFinite(s1) && Number.isFinite(s2)) arr.push(s1, s2);
    }
    return arr;
  }

  // Soumission des résultats d'un match
  const handleResultSubmit = async (matchId) => {
    const local = results[matchId];
    if (!local) return;

    const resultArray = buildResultArray(local);

    const { error: updErr } = await supabase
      .from("match")
      .update({ result: resultArray })
      .eq("id", matchId);

    if (updErr) {
      console.error("[useMatchesResult] save result error:", updErr);
      throw updErr;
    }

    // maj locale pour que l'UI reflète la sauvegarde
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, result: resultArray } : m))
    );

    if (typeof refreshMatches === "function") {
      try {
        await refreshMatches();
      } catch (_) {}
    }

    // Essaye d'enclencher la qualification si applicable
    const match = matches.find((m) => m.id === matchId);
    if (match?.group?.id && match?.group?.tournament_id) {
      await processGroupQualification(
        match.group.id,
        match.group.tournament_id
      );
    }
  };

  // Qualification automatique en fin de groupe
  const processGroupQualification = async (groupId, tId) => {
    // matches du groupe
    const { data: groupMatches, error: matchError } = await supabase
      .from("match")
      .select("id, result, player1_id, player2_id")
      .eq("group_id", groupId)
      .eq("tournament_id", tId);
    if (matchError) {
      console.error("[processGroupQualification] matchError:", matchError);
      return;
    }

    const groupFinished = (groupMatches || []).every(
      (m) => Array.isArray(m.result) && m.result.length >= 2
    );
    if (!groupFinished) return;

    // joueurs du groupe (la colonne group_id est un array)
    const { data: players, error: playerErr } = await supabase
      .from("player")
      .select("id, firstname, lastname, group_id")
      .contains("group_id", [groupId]);
    if (playerErr) {
      console.error("[processGroupQualification] playerErr:", playerErr);
      return;
    }

    // calcul points (1 point/victoire)
    const points = Object.fromEntries((players || []).map((p) => [p.id, 0]));
    (groupMatches || []).forEach((m) => {
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

    // lecture des groupes pour lire group_former (routing)
    const { data: allGroups, error: groupErr } = await supabase
      .from("group")
      .select("id, group_former")
      .eq("tournament_id", tId);
    if (groupErr) {
      console.error("[processGroupQualification] groupErr:", groupErr);
      return;
    }

    for (const g of allGroups || []) {
      if (!g.group_former) continue;

      let former;
      try {
        former = JSON.parse(g.group_former);
      } catch {
        continue;
      }

      // former: [[place, fromGroupId], ...]
      const targets = former
        .map((e) => ({ place: e?.[0], from: e?.[1] }))
        .filter((e) => e.place != null && e.from === groupId);

      for (const { place } of targets) {
        const player = classement[Number(place) - 1];
        if (!player) continue;

        const newGroupId = g.id;
        const current = Array.isArray(player.group_id) ? player.group_id : [];
        const updated = current.includes(newGroupId)
          ? current
          : [...current, newGroupId];

        const { error: updErr } = await supabase
          .from("player")
          .update({ group_id: updated })
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
