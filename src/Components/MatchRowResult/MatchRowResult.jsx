import React, { useState, useEffect, useRef } from "react";

const apiFetch = async (url, options = {}) => {
  const finalOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  const res = await fetch(url, finalOptions);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data) {
        // Priorité aux champs renvoyés par notre backend
        if (data.error || data.message) {
          const parts = [];
          if (data.error) parts.push(String(data.error));
          if (data.message && data.message !== data.error) {
            parts.push(String(data.message));
          }
          if (data.path) {
            parts.push(`path=${data.path}`);
          }
          message = parts.join(" — ");
        } else {
          // Si c'est une erreur PostgREST brute
          const raw = JSON.stringify(data);
          if (raw && raw !== "{}") {
            message = raw;
          }
        }
      }
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {
        // ignore
      }
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return null;
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
};
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const MatchRowResult = ({
  match,
  allgroups,
  index,
  mnr,
  referees = [],
  onMatchChange,
  onSave,
  allclubs,
  tournamentId,
}) => {
  const { t } = useTranslation();
  const getClubAbbr = (clubId) => {
    if (!clubId || !Array.isArray(allclubs)) return "";
    const club = allclubs.find((c) => String(c.id) === String(clubId));
    if (!club) return "";
    const abbr =
      club.abbr ||
      club.abbreviation ||
      club.acronym ||
      club.short_name ||
      club.shortname ||
      club.short ||
      club.code ||
      club.slug ||
      (typeof club.name === "string" ? club.name.split(" ")[0] : "");
    return abbr ? String(abbr).trim().toUpperCase() : "";
  };
  const [localResults, setLocalResults] = useState(
    match.result?.map((v) => (v === null ? "" : v.toString())) ||
      Array(10).fill("")
  );
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  console.log("console log dans matchRowResul", match);

  // Local edit buffers to avoid re-filtering/remount while typing
  const [editDay, setEditDay] = useState(match.match_day || "");
  const [editTime, setEditTime] = useState("");
  const [editTable, setEditTable] = useState(match.table_number ?? "");
  // Local referee selection state
  const [localReferee1Id, setLocalReferee1Id] = useState(
    match.referee1_id !== undefined
      ? match.referee1_id
      : match.referee_1
      ? match.referee_1.id
      : ""
  );
  const [localReferee2Id, setLocalReferee2Id] = useState(
    match.referee2_id !== undefined
      ? match.referee2_id
      : match.referee_2
      ? match.referee_2.id
      : ""
  );

  const [errorMsg, setErrorMsg] = useState("");

  // Accepts 1 to 5 sets written as pairs: a-b-a-b-... (no trailing hyphen)
  const RESULT_REGEX = /^\d{1,2}-\d{1,2}(?:-\d{1,2}-\d{1,2}){0,4}$/;

  const isValidResultText = (text) => {
    const trimmed = (text || "").trim();
    if (!RESULT_REGEX.test(trimmed)) return false;
    // optional: cap total items to 10 (5 sets)
    const parts = trimmed.split("-");
    return parts.length >= 2 && parts.length <= 10 && parts.length % 2 === 0;
  };

  useEffect(() => {
    setLocalResults(
      match.result?.map((v) => (v === null ? "" : v.toString())) ||
        Array(10).fill("")
    );
    setResultText(
      match.result?.filter((v) => v !== null && v !== undefined).join("-") || ""
    );
  }, [match.result]);

  useEffect(() => {
    // Initialisation quand on change de match
    setEditDay(match.match_day || "");
    setEditTime(match.match_time ? toHHMM(match.match_time) : "");
    setEditTable(match.table_number ?? "");

    // Initialiser les arbitres locaux à partir des props existantes
    setLocalReferee1Id(
      match.referee1_id !== undefined
        ? match.referee1_id
        : match.referee_1
        ? match.referee_1.id
        : ""
    );
    setLocalReferee2Id(
      match.referee2_id !== undefined
        ? match.referee2_id
        : match.referee_2
        ? match.referee_2.id
        : ""
    );
  }, [match.id]);

  const calculateStats = (result) => {
    let sets = [0, 0];
    let goals = [0, 0];

    for (let i = 0; i < result.length; i += 2) {
      const a = result[i];
      const b = result[i + 1];
      if (a == null || b == null) continue;
      if (a > b) sets[0]++;
      else sets[1]++;
      goals[0] += a;
      goals[1] += b;
    }

    let points = [0, 0];
    if (sets[0] > sets[1]) points = [1, 0];
    else if (sets[1] > sets[0]) points = [0, 1];
    // Sinon (égalité), on garde [0, 0]

    return { points, sets, goals };
  };

  // --- Helpers post-save ---
  const fetchGroupMatches = async (groupId) => {
    // Si pas de groupId valable, on ne fait pas d’appel API
    if (groupId === undefined || groupId === null || groupId === "") {
      console.warn("[fetchGroupMatches] groupId invalide:", groupId);
      return [];
    }

    const idNum = Number(groupId);
    if (!Number.isFinite(idNum)) {
      console.warn("[fetchGroupMatches] groupId non numérique:", groupId);
      return [];
    }

    const data = await apiFetch(`/api/groups/${idNum}/matches`, {
      method: "GET",
    });
    return data || [];
  };

  const matchesAreComplete = (matches) =>
    matches.length > 0 &&
    matches.every((m) => Array.isArray(m.result) && m.result.length >= 2);

  // Helper: checks if all matches in a group are complete
  const isGroupComplete = async (groupId) => {
    const matches = await fetchGroupMatches(groupId);
    return matchesAreComplete(matches);
  };

  const computeRankingFromMatches = (matches) => {
    // Collect unique player IDs present in these matches
    const playerIds = new Set();
    for (const m of matches) {
      if (m.player1_id) playerIds.add(m.player1_id);
      if (m.player2_id) playerIds.add(m.player2_id);
    }

    // Compute overall stats
    const overall = {}; // id -> { wins, setsWon, setsLost, goalsFor, goalsAgainst }
    for (const pid of playerIds) {
      overall[pid] = {
        wins: 0,
        setsWon: 0,
        setsLost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };
    }

    for (const m of matches) {
      const r = Array.isArray(m.result) ? m.result : [];
      let sA = 0,
        sB = 0,
        gA = 0,
        gB = 0;
      for (let i = 0; i < r.length; i += 2) {
        const a = r[i];
        const b = r[i + 1];
        if (a == null || b == null) continue;
        if (a > b) sA++;
        else if (b > a) sB++;
        gA += a;
        gB += b;
      }
      if (overall[m.player1_id]) {
        overall[m.player1_id].setsWon += sA;
        overall[m.player1_id].setsLost += sB;
        overall[m.player1_id].goalsFor += gA;
        overall[m.player1_id].goalsAgainst += gB;
      }
      if (overall[m.player2_id]) {
        overall[m.player2_id].setsWon += sB;
        overall[m.player2_id].setsLost += sA;
        overall[m.player2_id].goalsFor += gB;
        overall[m.player2_id].goalsAgainst += gA;
      }
      if (sA > sB && overall[m.player1_id]) overall[m.player1_id].wins += 1;
      else if (sB > sA && overall[m.player2_id])
        overall[m.player2_id].wins += 1;
    }

    // Helper: compute stats restricted to a subset of player IDs (direct encounters only)
    const directStats = (subsetIds) => {
      const ds = {};
      subsetIds.forEach((pid) => {
        ds[pid] = {
          setsWon: 0,
          setsLost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        };
      });
      for (const m of matches) {
        const a = m.player1_id;
        const b = m.player2_id;
        if (!subsetIds.includes(a) || !subsetIds.includes(b)) continue;
        const r = Array.isArray(m.result) ? m.result : [];
        let sA = 0,
          sB = 0,
          gA = 0,
          gB = 0;
        for (let i = 0; i < r.length; i += 2) {
          const va = r[i];
          const vb = r[i + 1];
          if (va == null || vb == null) continue;
          if (va > vb) sA++;
          else if (vb > va) sB++;
          gA += va;
          gB += vb;
        }
        ds[a].setsWon += sA;
        ds[a].setsLost += sB;
        ds[a].goalsFor += gA;
        ds[a].goalsAgainst += gB;
        ds[b].setsWon += sB;
        ds[b].setsLost += sA;
        ds[b].goalsFor += gB;
        ds[b].goalsAgainst += gA;
      }
      return ds;
    };

    const idsArray = Array.from(playerIds);

    // Sort using the same rules as GroupTable: wins desc, then direct encounters set diff, then direct encounters goal diff
    idsArray.sort((idA, idB) => {
      const pa = overall[idA];
      const pb = overall[idB];
      if (pb.wins !== pa.wins) return pb.wins - pa.wins;

      // Build the tie group: all players having the same number of wins as A
      const tiedIds = idsArray.filter((pid) => overall[pid].wins === pa.wins);
      if (tiedIds.length === 2 || tiedIds.length === 3) {
        const sub = directStats(tiedIds);
        const setDiffA = sub[idA].setsWon - sub[idA].setsLost;
        const setDiffB = sub[idB].setsWon - sub[idB].setsLost;
        if (setDiffA !== setDiffB) return setDiffB - setDiffA;
        const goalDiffA = sub[idA].goalsFor - sub[idA].goalsAgainst;
        const goalDiffB = sub[idB].goalsFor - sub[idB].goalsAgainst;
        if (goalDiffA !== goalDiffB) return goalDiffB - goalDiffA;
      }

      // Fallback: overall set diff, then overall goal diff, then stable by id
      const oSetDiffA = pa.setsWon - pa.setsLost;
      const oSetDiffB = pb.setsWon - pb.setsLost;
      if (oSetDiffA !== oSetDiffB) return oSetDiffB - oSetDiffA;
      const oGoalDiffA = pa.goalsFor - pa.goalsAgainst;
      const oGoalDiffB = pb.goalsFor - pb.goalsAgainst;
      if (oGoalDiffA !== oGoalDiffB) return oGoalDiffB - oGoalDiffA;
      return String(idA).localeCompare(String(idB));
    });

    // Return in the expected shape used later (playerId + stats)
    return idsArray.map((pid) => ({
      playerId: pid,
      ...overall[pid],
    }));
  };

  // Cache de ranking pour éviter des re-fetchs multiples entre rendus
  const rankingCacheRef = useRef(new Map()); // groupId -> ranking array

  const getRankingForGroup = async (groupId) => {
    const cache = rankingCacheRef.current;
    if (cache.has(groupId)) return cache.get(groupId);
    const matches = await fetchGroupMatches(groupId);
    if (!matches || matches.length === 0) {
      cache.set(groupId, []);
      return [];
    }
    const ranking = computeRankingFromMatches(matches);
    cache.set(groupId, ranking);
    return ranking;
  };

  // Trouver les groupes *cibles* qui référencent le groupe courant dans leur group_former
  const findDestinationGroups = (currentGroupId) => {
    return (allgroups || []).filter((g) => {
      if (!g.group_former) return false;
      try {
        const arr = JSON.parse(g.group_former);
        return (
          Array.isArray(arr) &&
          arr.some(([pos, srcId]) => Number(srcId) === Number(currentGroupId))
        );
      } catch {
        return false;
      }
    });
  };

  const ensureFormerArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v; // déjà JSON côté DB
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Supprime un group_id d'un joueur si présent
  const removeGroupFromPlayerIfPresent = async (playerId, groupIdToRemove) => {
    const p = await apiFetch(`/api/players/${playerId}`, {
      method: "GET",
    });

    const current = Array.isArray(p?.group_id) ? p.group_id : [];
    const next = current.filter(
      (gid) => Number(gid) !== Number(groupIdToRemove)
    );
    if (next.length === current.length) return; // rien à faire

    await apiFetch(`/api/players/${playerId}`, {
      method: "PATCH",
      body: JSON.stringify({ group_id: next }),
    });
  };

  // Récupère tous les joueurs qui ont ce group_id dans leur tableau
  const fetchPlayersHavingGroupId = async (groupId) => {
    const data = await apiFetch(`/api/players?groupId=${Number(groupId)}`, {
      method: "GET",
    });
    return data || [];
  };

  // Ajouter un group_id au joueur si pas déjà présent
  const addGroupToPlayerIfMissing = async (playerId, newGroupId) => {
    console.log("[addGroupToPlayerIfMissing] read player", {
      playerId,
      newGroupId,
    });

    const p = await apiFetch(`/api/players/${playerId}`, {
      method: "GET",
    });

    const current = Array.isArray(p?.group_id) ? p.group_id : [];
    const already = current.map(String).includes(String(newGroupId));
    if (already) return;

    const next = [...current, newGroupId];

    console.log("[addGroupToPlayerIfMissing] updating player group_id", {
      playerId,
      next,
    });

    await apiFetch(`/api/players/${playerId}`, {
      method: "PATCH",
      body: JSON.stringify({ group_id: next }),
    });

    console.log("[addGroupToPlayerIfMissing] update ok", { playerId });
  };

  // Remplit de façon idempotente et écrasante tous les matchs et joueurs du groupe cible en fonction de l'état courant des groupes sources
  const fillScheduledMatchesForGroup = async (destGroupId) => {
    const destGroup = (allgroups || []).find(
      (g) => Number(g.id) === Number(destGroupId)
    );
    if (!destGroup) return;

    const former = ensureFormerArray(destGroup.group_former);
    if (!former.length) return;

    // 1) Construire la liste des joueurs attendus pour ce groupe cible,
    //    en fonction des groupes sources et de leur complétude
    const desiredByPosition = new Map(); // key: index (0-based in former) -> playerId|null

    // On va mémoriser les joueurs "désirés" issus de chaque sourceGroupId
    const desiredGlobal = new Set();

    // Former est un tableau de paires [positionDansSource, sourceGroupId]
    for (let idx = 0; idx < former.length; idx++) {
      const entry = former[idx];
      if (!Array.isArray(entry) || entry.length < 2) {
        desiredByPosition.set(idx, null);
        continue;
      }
      const [posInSource, sourceGroupId] = entry;
      const complete = await isGroupComplete(Number(sourceGroupId));
      if (!complete) {
        desiredByPosition.set(idx, null);
        continue;
      }
      const ranking = await getRankingForGroup(Number(sourceGroupId));
      const pick = ranking[Number(posInSource) - 1];
      const pid = pick?.playerId || null;
      if (pid) desiredGlobal.add(pid);
      desiredByPosition.set(idx, pid || null);
    }

    // 2) Mettre à jour les MATCHS du groupe cible en écrasant systématiquement
    const mlist =
      (await apiFetch(`/api/groups/${destGroupId}/matches`, {
        method: "GET",
      })) || [];

    const matchUpdatePromises = [];

    const computeExpectedPlayer = (groupPos) => {
      if (!groupPos) return null;
      const idx = Number(groupPos) - 1; // 1-based -> 0-based index in former
      const entry = former[idx];
      if (!entry || !Array.isArray(entry) || entry.length < 2) return null;
      const desired = desiredByPosition.get(idx) ?? null;
      return desired || null; // null si groupe source incomplet
    };

    for (const m of mlist || []) {
      const expectedP1 = computeExpectedPlayer(m.player1_group_position);
      const expectedP2 = computeExpectedPlayer(m.player2_group_position);
      const patch = {};
      // Ecrase toujours pour rester idempotent
      if (m.player1_group_position) patch.player1_id = expectedP1;
      if (m.player2_group_position) patch.player2_id = expectedP2;
      if (Object.keys(patch).length) {
        matchUpdatePromises.push(
          apiFetch(`/api/tournaments/${tournamentId}/matches/${m.id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          })
        );
      }
    }

    if (matchUpdatePromises.length) {
      await Promise.all(matchUpdatePromises);
    }

    // 3) Mettre à jour les JOUEURS: ajouter/retirer le group_id
    //    a) Ajouter le group_id aux joueurs attendus s'ils ne l'ont pas
    await Promise.all(
      Array.from(desiredGlobal).map((pid) =>
        addGroupToPlayerIfMissing(pid, destGroupId)
      )
    );

    //    b) Retirer le group_id à tous les joueurs qui l'ont mais ne sont pas (ou plus) désirés
    const currentPlayers = await fetchPlayersHavingGroupId(destGroupId);
    const removals = currentPlayers
      .filter((p) => !desiredGlobal.has(p.id))
      .map((p) => removeGroupFromPlayerIfPresent(p.id, destGroupId));
    if (removals.length) await Promise.all(removals);

    console.log("[fillScheduledMatchesForGroup] sync done", {
      destGroupId,
      desiredCount: desiredGlobal.size,
      updatedMatches: matchUpdatePromises.length,
      removedPlayers: removals.length,
    });
  };

  // Post-traitement appelé après la sauvegarde d'un match
  const postProcessAfterSave = async (updatedMatch) => {
    console.log("[postProcessAfterSave] start", {
      groupId: updatedMatch.group_id,
      updatedMatch,
    });
    const groupId = updatedMatch.group_id;
    // 1) Récupérer tous les matchs du groupe
    const matches = await fetchGroupMatches(groupId);
    console.log("[postProcessAfterSave] matches fetched", {
      count: matches.length,
      matches,
    });
    // 2) Chercher les groupes cibles qui référencent ce groupe (on sync **même** si incomplet)
    const destGroups = findDestinationGroups(groupId);
    console.log(
      "[postProcessAfterSave] destination groups",
      destGroups.map((g) => ({
        id: g.id,
        name: g.name,
        group_former: g.group_former,
      }))
    );
    if (!destGroups.length) return;

    const complete = matchesAreComplete(matches);
    console.log("[postProcessAfterSave] group completeness", complete);

    // 3) Si complet: on peut calculer un ranking; sinon, on videra les attentes
    const ranking = complete ? computeRankingFromMatches(matches) : [];
    if (complete)
      console.log("[postProcessAfterSave] ranking computed", ranking);

    // 4) Pour chaque groupe destination, appliquer la synchro idempotente (écrase/retire/ajoute)
    for (const g of destGroups) {
      try {
        await fillScheduledMatchesForGroup(g.id);
      } catch (e) {
        console.error(
          "[postProcessAfterSave] sync error for dest group",
          g?.id,
          e
        );
      }
    }
  };

  const formatTime = (t) => {
    if (!t) return "";
    if (typeof t === "string") {
      // Expecting formats like "08:00:00" or "8:0:0"; take HH and MM only
      const parts = t.split(":");
      if (parts.length >= 2) {
        const hh = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        return `${hh}:${mm}`;
      }
    }
    // Fallback: try parsing as Date
    try {
      const d = new Date(t);
      if (!isNaN(d)) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }
    } catch (_) {}
    return String(t);
  };

  const toHHMM = (t) => {
    // Ensure a clean HH:MM string for <input type="time">
    if (!t) return "";
    if (typeof t === "string") {
      const parts = t.split(":");
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
      }
    }
    try {
      const d = new Date(t);
      if (!isNaN(d)) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`;
      }
    } catch (_) {}
    return "";
  };

  const toHHMMSS = (t) => {
    // Convert HH:MM or HH:MM:SS to HH:MM:SS for DB
    if (!t) return null;
    if (typeof t === "string") {
      const parts = t.split(":");
      if (parts.length === 2) {
        const hh = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        return `${hh}:${mm}:00`;
      }
      if (parts.length >= 3) {
        const hh = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        const ss = parts[2].padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
      }
    }
    try {
      const d = new Date(t);
      if (!isNaN(d)) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}:00`;
      }
    } catch (_) {}
    return null;
  };

  const parsedResults = localResults.map((v) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  });
  const { points, sets, goals } = calculateStats(parsedResults);

  const handleSave = async () => {
    // Validate before saving. Allow empty string to clear the result.
    const inputText = (resultText || "").trim();

    let cleanedResults = [];
    if (inputText === "") {
      cleanedResults = [];
    } else {
      if (!isValidResultText(inputText)) {
        setErrorMsg(
          t("invalidResultFormat") ||
            "Format invalide. Utilisez des paires a-b séparées par des tirets (ex: 11-1 ou 11-1-11-1), maximum 5 sets."
        );
        setIsEditing(true);
        return; // stop here, do not save
      }

      cleanedResults = inputText
        .split("-")
        .map((v) => parseInt(v, 10))
        .filter((v) => !Number.isNaN(v));

      if (
        cleanedResults.length % 2 !== 0 ||
        cleanedResults.length < 2 ||
        cleanedResults.length > 10
      ) {
        setErrorMsg(
          t("invalidResultFormat") ||
            "Format invalide. Entrez des paires a-b (min 1 set, max 5 sets)."
        );
        setIsEditing(true);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        result: cleanedResults,
        // Utiliser la sélection locale des arbitres (selects) plutôt que les props match.*
        referee1_id:
          localReferee1Id === "" || localReferee1Id === null
            ? null
            : Number(localReferee1Id),
        referee2_id:
          localReferee2Id === "" || localReferee2Id === null
            ? null
            : Number(localReferee2Id),
        match_day: editDay || null,
        match_time: toHHMMSS(editTime) || null,
        table_number: editTable === "" ? null : Number(editTable),
      };

      const updated = await apiFetch(
        `/api/tournaments/${tournamentId}/matches/${match.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      const effective = updated || { ...match, ...payload };

      await postProcessAfterSave(effective);
      onMatchChange(match.id, "match_day", effective.match_day);
      onMatchChange(match.id, "match_time", effective.match_time);
      onMatchChange(match.id, "table_number", effective.table_number);
      onMatchChange(match.id, "referee1_id", effective.referee1_id);
      onMatchChange(match.id, "referee2_id", effective.referee2_id);

      // Mettre à jour immédiatement l'état local des arbitres pour refléter la sauvegarde
      setLocalReferee1Id(
        effective.referee1_id !== undefined && effective.referee1_id !== null
          ? effective.referee1_id
          : ""
      );
      setLocalReferee2Id(
        effective.referee2_id !== undefined && effective.referee2_id !== null
          ? effective.referee2_id
          : ""
      );

      onSave(effective);
    } catch (err) {
      alert(err.message || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr>
      <td className="text-center">{mnr ?? index + 1}</td>
      <td className="text-center">
        <input
          type="date"
          className="form-control form-control-sm text-center"
          value={editDay}
          onChange={(e) => setEditDay(e.target.value)}
        />
      </td>
      <td className="text-center">
        <input
          type="time"
          step="60"
          className="form-control form-control-sm text-center"
          value={editTime}
          onChange={(e) => setEditTime(e.target.value)}
        />
      </td>
      <td className="text-center">
        <input
          type="number"
          min="1"
          className="form-control form-control-sm text-center"
          value={editTable}
          onChange={(e) => setEditTable(e.target.value)}
        />
      </td>
      <td className="text-center">
        {match?.group?.id ? (
          <Link to={`/tournament/${tournamentId}/groups/${match.group.id}`}>
            {match.group.name} |{" "}
            {(t(match.group.group_type) || match.group.group_type || "")
              .toString()
              .charAt(0)
              .toUpperCase()}
          </Link>
        ) : (
          <span role="text">—</span>
        )}
      </td>
      <td className="text-center">
        {match.player1 && match.player2 ? (
          <>
            <span
              role="text"
              aria-label={`${match.player1.firstname} ${match.player1.lastname}`}
            >
              {(() => {
                const ab = getClubAbbr(match.player1.club_id);
                const label = `${match.player1.lastname} ${
                  match.player1.firstname
                }${ab ? ` (${ab})` : ""}`;
                return tournamentId ? (
                  <Link
                    to={`/tournament/${tournamentId}/players/${match.player1.id}`}
                  >
                    {label}
                  </Link>
                ) : (
                  label
                );
              })()}
            </span>
            <span role="text" aria-label="versus">
              {" "}
              vs{" "}
            </span>
            <span
              role="text"
              aria-label={`${match.player2.firstname} ${match.player2.lastname}`}
            >
              {(() => {
                const ab = getClubAbbr(match.player2.club_id);
                const label = `${match.player2.lastname} ${
                  match.player2.firstname
                }${ab ? ` (${ab})` : ""}`;
                return tournamentId ? (
                  <Link
                    to={`/tournament/${tournamentId}/players/${match.player2.id}`}
                  >
                    {label}
                  </Link>
                ) : (
                  label
                );
              })()}
            </span>
          </>
        ) : (
          <>
            {match.player1_group_position &&
            match.player2_group_position &&
            match.group?.group_former ? (
              (() => {
                let formerArr = [];
                try {
                  formerArr = JSON.parse(match.group.group_former);
                } catch (_) {
                  return <span role="text">{t("notAssigned")}</span>;
                }

                const getLabel = (position) => {
                  const entry = formerArr[Number(position) - 1];
                  if (!entry) return position;
                  const groupId = entry[1];
                  const group = (allgroups || []).find(
                    (g) => Number(g.id) === Number(groupId)
                  );
                  return group
                    ? `${group.name}(${entry[0]})`
                    : `${groupId}(${entry[0]})`;
                };

                return (
                  <span role="text">
                    {getLabel(match.player1_group_position)} vs{" "}
                    {getLabel(match.player2_group_position)}
                  </span>
                );
              })()
            ) : (
              <span role="text">{t("notAssigned")}</span>
            )}
          </>
        )}
      </td>
      <td className="text-center">
        <span role="text">
          {points[0]} - {points[1]}
        </span>
      </td>
      <td className="text-center">
        <span role="text">
          {sets[0]} - {sets[1]}
        </span>
      </td>
      <td className="text-center">
        <span role="text">
          {goals[0]} - {goals[1]}
        </span>
      </td>
      <td className="text-center">
        {isEditing && match.player1 && match.player2 ? (
          <>
            <input
              type="text"
              className="form-control form-control-sm text-center"
              style={{ textAlign: "center" }}
              aria-invalid={!!errorMsg}
              placeholder="11-1-11-1"
              value={resultText}
              onChange={(e) => {
                const text = e.target.value.replace(/\s+/g, ""); // remove spaces
                setResultText(text);

                // Update local array for preview while typing
                const parts = text
                  .split("-")
                  .map((v) => {
                    const n = parseInt(v.trim(), 10);
                    return Number.isNaN(n) ? "" : n.toString();
                  })
                  .filter((v) => v !== "");
                setLocalResults(parts);

                // Live validation message (optional while typing)
                if (text.length === 0) {
                  setErrorMsg("");
                } else if (!isValidResultText(text)) {
                  setErrorMsg(
                    t("invalidResultFormatShort") ||
                      "Format: a-b ou a-b-a-b (jusqu'à 5 sets)."
                  );
                } else {
                  setErrorMsg("");
                }
              }}
            />
            {errorMsg && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-1 small text-danger"
              >
                {errorMsg}
              </div>
            )}
          </>
        ) : (
          <div
            role="button"
            onClick={() => {
              if (match.player1 && match.player2) setIsEditing(true);
            }}
            style={{
              cursor:
                match.player1 && match.player2 ? "pointer" : "not-allowed",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              justifyContent: "center",
            }}
          >
            {localResults.filter((v) => v !== "").length > 0
              ? localResults
                  .reduce((acc, curr, idx) => {
                    if (idx % 2 === 0) {
                      acc.push([curr]);
                    } else {
                      acc[acc.length - 1].push(curr);
                    }
                    return acc;
                  }, [])
                  .filter(([a, b]) => a || b)
                  .map(([a, b], i) => (
                    <span key={i} role="text">
                      {a || "—"}-{b || "—"}
                      {i <
                      Math.floor(
                        localResults.filter((v) => v !== "").length / 2
                      ) -
                        1
                        ? "; "
                        : ""}
                    </span>
                  ))
              : "edit"}
          </div>
        )}
      </td>
      <td className="text-center">
        <select
          disabled={!match.player1 || !match.player2}
          className="form-select form-select-sm mb-1"
          style={{ textAlign: "center" }}
          value={localReferee1Id === null ? "" : String(localReferee1Id)}
          onChange={(e) => {
            const val = e.target.value;
            setLocalReferee1Id(val === "" ? "" : val);
            onMatchChange(match.id, "referee1_id", val ? Number(val) : null);
          }}
        >
          <option value="">{t("none")}</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.lastname} {r.firstname}
            </option>
          ))}
        </select>

        <select
          disabled={!match.player1 || !match.player2}
          className="form-select form-select-sm"
          style={{ textAlign: "center" }}
          value={localReferee2Id === null ? "" : String(localReferee2Id)}
          onChange={(e) => {
            const val = e.target.value;
            setLocalReferee2Id(val === "" ? "" : val);
            onMatchChange(match.id, "referee2_id", val ? Number(val) : null);
          }}
        >
          <option value="">{t("none")}</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.lastname} {r.firstname}
            </option>
          ))}
        </select>
      </td>
      <td className="text-center">
        {!match.player1 || !match.player2 ? (
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled
            title={t("notAssigned")}
          >
            edit
          </button>
        ) : isEditing ? (
          <button
            className="btn btn-sm btn-success"
            disabled={loading || (resultText && !isValidResultText(resultText))}
            title={
              resultText && !isValidResultText(resultText)
                ? t("invalidResultFormatShort") || "Corrigez le format a-b-a-b"
                : undefined
            }
            onClick={() => {
              handleSave();
              // keep editing open only if invalid; handleSave returns early on invalid
              if (!resultText || isValidResultText(resultText))
                setIsEditing(false);
            }}
          >
            save
          </button>
        ) : localResults.every((v) => v === "") ? (
          <button
            className="btn btn-sm btn-success"
            disabled={loading || (resultText && !isValidResultText(resultText))}
            title={
              resultText && !isValidResultText(resultText)
                ? t("invalidResultFormatShort") || "Corrigez le format a-b-a-b"
                : undefined
            }
            onClick={() => {
              handleSave();
              if (!resultText || isValidResultText(resultText))
                setIsEditing(true);
            }}
          >
            save
          </button>
        ) : (
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            edit
          </button>
        )}
      </td>
    </tr>
  );
};

export default MatchRowResult;
