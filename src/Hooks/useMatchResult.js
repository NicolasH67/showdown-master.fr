// src/Hooks/useMatchResult.js
// Hook de gestion des matchs (récupération, édition et sauvegarde des résultats)
// -> version sans accès direct à Supabase : utilise uniquement les routes /api

import { useEffect, useRef, useState } from "react";
import { get, patch, ApiError } from "../Helpers/apiClient";
import usePlayers from "./usePlayers";
import useMatches from "./useMatchs";
import useGroupsData from "./useGroupsData";
import useReferees from "./useReferee"; // garde le même chemin que dans le projet

const MAX_SETS = 5; // sécurité côté UI

// Essaie une liste d'URLs et renvoie le premier JSON OK
async function firstOk(paths, options = {}) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const json =
        options.method === "PATCH"
          ? await patch(p, options.body)
          : await get(p);
      return json;
    } catch (e) {
      lastErr = e;
      // si 404/405 on tente le fallback suivant
      if (e?.status === 404 || e?.status === 405) continue;
      // sinon on s'arrête
      break;
    }
  }
  throw lastErr || new ApiError("not_found", { status: 404, body: null });
}

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

  const {
    players: players = [],
    loading: playersLoading = false,
    error: playersError = null,
  } = usePlayers(tournamentId);

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
    const compositeLoading =
      matchesLoading || groupsLoading || refsLoading || playersLoading;
    setLoading(compositeLoading);

    // première erreur disponible
    setError(matchesError || groupsError || refsError || playersError || null);

    if (!compositeLoading) {
      // copie éditable des matchs
      setMatches(Array.isArray(hookMatches) ? hookMatches : []);
    }
  }, [
    matchesLoading,
    groupsLoading,
    refsLoading,
    playersLoading,
    hookMatches,
    matchesError,
    groupsError,
    refsError,
    playersError,
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

  // Sauvegarde d'un match (métadonnées) — via PATCH /api
  const handleSave = async (matchId) => {
    const idNum = Number(tournamentId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Invalid tournament id");
    }

    const matchToSave = matches.find((m) => m.id === matchId);
    if (!matchToSave) return;

    // Normalisation du payload
    const payload = {
      match_day: matchToSave.match_day || null,
      match_time: matchToSave.match_time || null,
      table_number: matchToSave.table_number
        ? parseInt(matchToSave.table_number, 10)
        : null,
      referee1_id:
        matchToSave.referee1_id != null
          ? Number(matchToSave.referee1_id)
          : null,
      referee2_id:
        matchToSave.referee2_id != null
          ? Number(matchToSave.referee2_id)
          : null,
    };

    const urls = [
      `/api/tournaments/${idNum}/matches/${matchId}`, // handler unifié
      `/api/tournaments/matches/${matchId}?id=${idNum}`, // fallback
    ];

    await firstOk(urls, { method: "PATCH", body: payload });

    // maj locale pour refléter la sauvegarde
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, ...payload } : m))
    );
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

  // Soumission des résultats d'un match — via PATCH /api
  const handleResultSubmit = async (matchId) => {
    const idNum = Number(tournamentId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Invalid tournament id");
    }

    const local = results[matchId];
    if (!local) return;

    const resultArray = buildResultArray(local);

    const urls = [
      `/api/tournaments/${idNum}/matches/${matchId}`,
      `/api/tournaments/matches/${matchId}?id=${idNum}`,
    ];

    await firstOk(urls, { method: "PATCH", body: { result: resultArray } });

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

  // Qualification automatique en fin de groupe — 100% via /api
  const processGroupQualification = async (groupId, tId) => {
    const tid = Number(tId);
    if (!Number.isFinite(tid) || tid <= 0) return;

    // Récupère tous les matchs du tournoi puis filtre par groupe
    const allMatches = await firstOk([
      `/api/tournaments/${tid}/matches`,
      `/api/tournaments/matches?id=${tid}`,
    ]);
    const groupMatches = (Array.isArray(allMatches) ? allMatches : []).filter(
      (m) => Number(m.group_id) === Number(groupId)
    );

    const groupFinished = groupMatches.every(
      (m) => Array.isArray(m.result) && m.result.length >= 2
    );
    if (!groupFinished) return;

    // Récupère tous les joueurs du tournoi puis filtre par appartenance au groupe
    const allPlayers = await firstOk([
      `/api/tournaments/${tid}/players`,
      `/api/tournaments/players?id=${tid}`,
    ]);
    const playersInGroup = (Array.isArray(allPlayers) ? allPlayers : []).filter(
      (p) =>
        Array.isArray(p.group_id) &&
        p.group_id.some((gid) => Number(gid) === Number(groupId))
    );

    // calcul points (1 point/victoire)
    const points = Object.fromEntries(playersInGroup.map((p) => [p.id, 0]));
    groupMatches.forEach((m) => {
      if (!Array.isArray(m.result) || m.result.length < 2) return;
      const sum1 = m.result
        .filter((_, i) => i % 2 === 0)
        .reduce((a, b) => a + b, 0);
      const sum2 = m.result
        .filter((_, i) => i % 2 === 1)
        .reduce((a, b) => a + b, 0);
      if (sum1 > sum2 && m.player1?.id) points[m.player1.id] += 1;
      else if (sum2 > sum1 && m.player2?.id) points[m.player2.id] += 1;
    });

    const classement = [...playersInGroup].sort(
      (a, b) =>
        points[b.id] - points[a.id] || a.lastname.localeCompare(b.lastname)
    );

    // Lecture des groupes pour lire group_former
    const allGroups = await firstOk([
      `/api/tournaments/${tid}/groups`,
      `/api/tournaments/groups?id=${tid}`,
    ]);

    for (const g of Array.isArray(allGroups) ? allGroups : []) {
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

        // PATCH joueur via /api
        await firstOk(
          [
            `/api/tournaments/${tid}/players/${player.id}`,
            `/api/tournaments/players/${player.id}?id=${tid}`,
          ],
          {
            method: "PATCH",
            body: { group_id: updated },
          }
        );
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
