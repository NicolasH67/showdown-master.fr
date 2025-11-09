// src/Hooks/useMatchResult.js
// Hook de gestion des matchs (récupération, édition et sauvegarde des résultats)
import { useEffect, useRef, useState } from "react";
import supabase from "../Helpers/supabaseClient";

const MAX_SETS = 5; // sécurité côté UI

const useMatchesResult = (tournamentId) => {
  const [matches, setMatches] = useState([]);
  const [referees, setReferees] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);

  // évite les setState après un unmount
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    const fetchMatchesAndReferees = async () => {
      try {
        setLoading(true);
        setError(null);

        const idNum = Number(tournamentId);
        if (!Number.isFinite(idNum) || idNum <= 0) {
          throw new Error("Invalid tournament id");
        }

        // 1) Matches: tri côté SQL pour éviter le tri JS et les fautes de colonnes
        const { data: matchData, error: matchError } = await supabase
          .from("match")
          .select(
            `
            id,
            player1:player1_id(id, firstname, lastname, club_id),
            player2:player2_id(id, firstname, lastname, club_id),
            player1_group_position,
            player2_group_position,
            group:group_id(id, name, group_type, group_former, tournament_id),
            match_day,
            match_time,
            table_number,
            referee1_id,
            referee2_id,
            result,
            tournament_id,
            group_id
          `
          )
          .eq("tournament_id", idNum)
          .order("match_day", { ascending: true })
          .order("match_time", { ascending: true })
          .order("table_number", { ascending: true });
        if (matchError) throw matchError;

        // 2) Groups
        const { data: groupData, error: groupError } = await supabase
          .from("group")
          .select("id, name, group_former, tournament_id")
          .eq("tournament_id", idNum)
          .order("name", { ascending: true });
        if (groupError) throw groupError;

        // 3) Referees
        const { data: refereeData, error: refereeError } = await supabase
          .from("referee")
          .select("id, firstname, lastname")
          .eq("tournament_id", idNum)
          .order("lastname", { ascending: true })
          .order("firstname", { ascending: true });
        if (refereeError) throw refereeError;

        if (!cancelledRef.current) {
          setMatches(matchData || []);
          setGroups(groupData || []);
          setReferees(refereeData || []);
        }
      } catch (err) {
        console.error("[useMatchesResult] fetch error:", err);
        if (!cancelledRef.current) setError(err);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    };

    fetchMatchesAndReferees();
  }, [tournamentId]);

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
