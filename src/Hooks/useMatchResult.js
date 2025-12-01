// src/Hooks/useMatchResult.js
// Hook de gestion des matchs (récupération, édition et sauvegarde des résultats)
// -> version sans accès direct à Supabase : utilise uniquement les routes /api

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
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
      if (options.method === "PATCH") {
        try {
          const out = await patch(p, options.body);
          // Si la route renvoie 204/empty, notre client peut renvoyer undefined => considérer comme succès
          return out === undefined ? {} : out;
        } catch (e) {
          // Accepte aussi les cas où le serveur répond 204 No Content
          if (
            e?.status === 204 ||
            String(e?.message || "").includes("No content")
          ) {
            return {};
          }
          throw e;
        }
      } else {
        const json = await get(p);
        return json;
      }
    } catch (e) {
      lastErr = e;
      if (e?.status === 404 || e?.status === 405) continue; // essayer le fallback suivant
      break; // autre erreur => on s'arrête
    }
  }
  throw lastErr || new ApiError("not_found", { status: 404, body: null });
}

const useMatchesResult = (tournamentId) => {
  const params = useParams();
  const rawId = tournamentId ?? params?.id;
  const resolvedIdNum = Number(rawId);
  const [matches, setMatches] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clubs, setClubs] = useState([]);
  const API_BASE = import.meta.env.VITE_API_BASE || "";

  // données issues des hooks centralisés
  const {
    matches: hookMatches = [],
    loading: matchesLoading = false,
    error: matchesError = null,
    refresh: refreshMatches,
  } = useMatches(resolvedIdNum);

  const {
    groups: hookGroups = [],
    loading: groupsLoading = false,
    error: groupsError = null,
  } = useGroupsData(resolvedIdNum);

  const {
    referees: hookReferees = [],
    loading: refsLoading = false,
    error: refsError = null,
  } = useReferees(resolvedIdNum);

  const {
    players: players = [],
    loading: playersLoading = false,
    error: playersError = null,
  } = usePlayers(resolvedIdNum);

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

  // Chargement des clubs du tournoi via les routes /api
  useEffect(() => {
    let cancelled = false;

    const loadClubs = async () => {
      const idNum = resolvedIdNum;
      if (!Number.isFinite(idNum) || idNum <= 0) {
        if (!cancelled) setClubs([]);
        return;
      }

      try {
        const data = await firstOk([
          `${API_BASE}/api/tournaments/${idNum}/clubs`,
          `${API_BASE}/api/tournaments/clubs?id=${idNum}`,
        ]);
        if (!cancelled) {
          setClubs(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Erreur chargement clubs pour le tournoi", idNum, e);
        if (!cancelled) {
          setClubs([]);
        }
      }
    };

    loadClubs();
    return () => {
      cancelled = true;
    };
  }, [resolvedIdNum]);

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

  // Helper to normalize matchId to a usable id value
  const normalizeMatchId = (value) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      const first = value[0];
      if (first && typeof first === "object" && "id" in first) {
        return first.id;
      }
      return first;
    }
    if (value && typeof value === "object" && "id" in value) {
      return value.id;
    }
    return value;
  };

  // Sauvegarde d'un match (métadonnées) — via PATCH /api
  // ⚠️ Ici on ne touche PLUS aux arbitres : ils sont gérés dans MatchRowResult/useMatchRowApi
  // Sauvegarde d'un match (métadonnées + arbitres) — via PATCH /api
  // Sauvegarde d'un match (métadonnées + arbitres) — via PATCH /api
  const handleSave = async (matchId) => {
    const realId = normalizeMatchId(matchId);
    console.log("[useMatchesResult] handleSave start", {
      rawMatchId: matchId,
      matchId: realId,
    });

    const idNum = resolvedIdNum;
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Invalid tournament id");
    }

    if (realId == null) {
      console.warn("[useMatchesResult] handleSave called with invalid id", {
        rawMatchId: matchId,
      });
      return;
    }

    const matchToSave = matches.find((m) => String(m.id) === String(realId));
    console.log("[useMatchesResult] handleSave matchToSave", matchToSave);
    if (!matchToSave) return;

    // Métadonnées de planning
    const payload = {
      match_day: matchToSave.match_day || null,
      match_time: matchToSave.match_time || null,
      table_number: matchToSave.table_number
        ? parseInt(matchToSave.table_number, 10)
        : null,
    };

    // 🔹 On ajoute les arbitres si on a l'info dans le match local
    if (Object.prototype.hasOwnProperty.call(matchToSave, "referee1_id")) {
      payload.referee1_id =
        matchToSave.referee1_id === undefined ? null : matchToSave.referee1_id;
    }
    if (Object.prototype.hasOwnProperty.call(matchToSave, "referee2_id")) {
      payload.referee2_id =
        matchToSave.referee2_id === undefined ? null : matchToSave.referee2_id;
    }

    console.log("[useMatchesResult] handleSave payload", {
      matchId: realId,
      payload,
    });

    const urls = [
      `${API_BASE}/api/tournaments/${idNum}/matches/${realId}`,
      `${API_BASE}/api/tournaments/matches/${realId}?id=${idNum}`,
    ];

    await firstOk(urls, { method: "PATCH", body: payload });
    console.log("[useMatchesResult] handleSave PATCH done", {
      matchId: realId,
    });

    // Mise à jour locale
    setMatches((prev) =>
      prev.map((m) =>
        String(m.id) === String(realId) ? { ...m, ...payload } : m
      )
    );
    console.log("[useMatchesResult] handleSave local state updated", {
      matchId: realId,
    });
  };

  // Soumission des résultats d'un match — via PATCH /api
  const handleResultSubmit = async (matchId) => {
    console.log("[useMatchesResult] handleResultSubmit start", { matchId });
    const idNum = resolvedIdNum;
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Invalid tournament id");
    }

    const local = results[matchId];
    console.log("[useMatchesResult] handleResultSubmit local", {
      matchId,
      local,
    });
    if (!local) return;

    const resultArray = buildResultArray(local);
    console.log("[useMatchesResult] handleResultSubmit resultArray", {
      matchId,
      resultArray,
    });

    const urls = [
      `${API_BASE}/api/tournaments/${idNum}/matches/${matchId}`,
      `${API_BASE}/api/tournaments/matches/${matchId}?id=${idNum}`,
    ];

    await firstOk(urls, { method: "PATCH", body: { result: resultArray } });
    console.log("[useMatchesResult] handleResultSubmit PATCH done", {
      matchId,
    });

    // maj locale pour que l'UI reflète la sauvegarde
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, result: resultArray } : m))
    );
    console.log("[useMatchesResult] handleResultSubmit local state updated", {
      matchId,
    });

    if (typeof refreshMatches === "function") {
      try {
        await refreshMatches();
        console.log(
          "[useMatchesResult] handleResultSubmit refreshMatches done",
          { matchId }
        );
      } catch (_) {}
    }

    // Essaye d'enclencher la qualification si applicable
    const match = matches.find((m) => m.id === matchId);
    console.log(
      "[useMatchesResult] handleResultSubmit before processGroupQualification",
      {
        matchId,
        groupId: match?.group?.id,
        tournamentId: match?.group?.tournament_id,
        match,
      }
    );
    if (match?.group?.id && match?.group?.tournament_id) {
      await processGroupQualification(
        match.group.id,
        match.group.tournament_id
      );
    }
  };

  // Qualification automatique en fin de groupe — 100% via /api
  const processGroupQualification = async (groupId, tId) => {
    console.log("[useMatchesResult] processGroupQualification start", {
      groupId,
      tId,
    });
    const tid = Number(tId);
    if (!Number.isFinite(tid) || tid <= 0) {
      console.warn("[useMatchesResult] processGroupQualification invalid tid", {
        groupId,
        tId,
      });
      return;
    }

    // Récupère tous les matchs du tournoi puis filtre par groupe
    const allMatches = await firstOk([
      `${API_BASE}/api/tournaments/${tid}/matches`,
      `${API_BASE}/api/tournaments/matches?id=${tid}`,
    ]);
    console.log("[useMatchesResult] processGroupQualification allMatches", {
      groupId,
      tId,
      totalMatches: Array.isArray(allMatches) ? allMatches.length : null,
    });
    const groupMatches = (Array.isArray(allMatches) ? allMatches : []).filter(
      (m) => Number(m.group_id) === Number(groupId)
    );
    console.log("[useMatchesResult] processGroupQualification groupMatches", {
      groupId,
      count: groupMatches.length,
      groupMatches,
    });

    const groupFinished = groupMatches.every(
      (m) => Array.isArray(m.result) && m.result.length >= 2
    );
    console.log("[useMatchesResult] processGroupQualification groupFinished", {
      groupId,
      groupFinished,
    });
    if (!groupFinished) return;

    // Récupère tous les joueurs du tournoi puis filtre par appartenance au groupe
    const allPlayers = await firstOk([
      `${API_BASE}/api/tournaments/${tid}/players`,
      `${API_BASE}/api/tournaments/players?id=${tid}`,
    ]);
    console.log("[useMatchesResult] processGroupQualification allPlayers", {
      tournamentId: tid,
      totalPlayers: Array.isArray(allPlayers) ? allPlayers.length : null,
    });
    const playersInGroup = (Array.isArray(allPlayers) ? allPlayers : []).filter(
      (p) =>
        Array.isArray(p.group_id) &&
        p.group_id.some((gid) => Number(gid) === Number(groupId))
    );
    console.log("[useMatchesResult] processGroupQualification playersInGroup", {
      groupId,
      count: playersInGroup.length,
      playersInGroup,
    });

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
    console.log("[useMatchesResult] processGroupQualification points", points);

    const classement = [...playersInGroup].sort(
      (a, b) =>
        points[b.id] - points[a.id] || a.lastname.localeCompare(b.lastname)
    );
    console.log(
      "[useMatchesResult] processGroupQualification classement",
      classement
    );

    // Lecture des groupes pour lire group_former
    const allGroups = await firstOk([
      `${API_BASE}/api/tournaments/${tid}/groups`,
      `${API_BASE}/api/tournaments/groups?id=${tid}`,
    ]);
    console.log("[useMatchesResult] processGroupQualification allGroups", {
      totalGroups: Array.isArray(allGroups) ? allGroups.length : null,
    });

    for (const g of Array.isArray(allGroups) ? allGroups : []) {
      if (!g.group_former) continue;

      let former;
      try {
        former = JSON.parse(g.group_former);
      } catch {
        continue;
      }
      console.log("[useMatchesResult] processGroupQualification group_former", {
        targetGroupId: g.id,
        former,
      });

      // former: [[place, fromGroupId], ...]
      const targets = former
        .map((e) => ({ place: e?.[0], from: e?.[1] }))
        .filter((e) => e.place != null && e.from === groupId);
      console.log("[useMatchesResult] processGroupQualification targets", {
        targetGroupId: g.id,
        fromGroupId: groupId,
        targets,
      });

      for (const { place } of targets) {
        const player = classement[Number(place) - 1];
        if (!player) continue;

        const newGroupId = g.id;
        const current = Array.isArray(player.group_id) ? player.group_id : [];
        const updated = current.includes(newGroupId)
          ? current
          : [...current, newGroupId];

        console.log(
          "[useMatchesResult] processGroupQualification assign player",
          {
            fromGroupId: groupId,
            targetGroupId: newGroupId,
            place,
            playerId: player.id,
            updatedGroupIds: updated,
          }
        );

        // PATCH joueur via /api
        await firstOk(
          [
            `${API_BASE}/api/tournaments/${tid}/players/${player.id}`,
            `${API_BASE}/api/tournaments/players/${player.id}?id=${tid}`,
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
    clubs,
    loading,
    error,
    results,
    handleMatchChange,
    handleResultChange,
    handleSave,
    handleResultSubmit,
    // expose refresh from useMatches so the UI can re-fetch after a save
    refresh: refreshMatches,
  };
};

export default useMatchesResult;
