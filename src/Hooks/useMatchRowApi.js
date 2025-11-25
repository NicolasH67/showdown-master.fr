// src/Hooks/useMatchRowApi.js
import { useRef } from "react";

/**
 * Petit wrapper fetch avec gestion d'erreurs homogène
 * On travaille en chemins relatifs (/api/...) et on prepend API_BASE ici.
 */
const apiFetch = async (path, options = {}) => {
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  const url = `${API_BASE}${path}`;

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

/**
 * Hook qui centralise :
 *  - le PATCH d'un match
 *  - la propagation vers les groupes / joueurs liés via group_former
 */
const useMatchRowApi = (tournamentId, allGroups = []) => {
  const rankingCacheRef = useRef(new Map()); // groupId -> ranking array

  // ------- FETCH MATCHES D'UN GROUPE -------

  const fetchGroupMatches = async (groupId) => {
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

  const isGroupComplete = async (groupId) => {
    const matches = await fetchGroupMatches(groupId);
    return matchesAreComplete(matches);
  };

  // ------- RANKING À PARTIR DES MATCHES -------

  const computeRankingFromMatches = (matches) => {
    const playerIds = new Set();
    for (const m of matches) {
      if (m.player1_id) playerIds.add(m.player1_id);
      if (m.player2_id) playerIds.add(m.player2_id);
    }

    const overall = {};
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

    idsArray.sort((idA, idB) => {
      const pa = overall[idA];
      const pb = overall[idB];
      if (pb.wins !== pa.wins) return pb.wins - pa.wins;

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

      const oSetDiffA = pa.setsWon - pa.setsLost;
      const oSetDiffB = pb.setsWon - pb.setsLost;
      if (oSetDiffA !== oSetDiffB) return oSetDiffB - oSetDiffA;
      const oGoalDiffA = pa.goalsFor - pa.goalsAgainst;
      const oGoalDiffB = pb.goalsFor - pb.goalsAgainst;
      if (oGoalDiffA !== oGoalDiffB) return oGoalDiffB - oGoalDiffA;
      return String(idA).localeCompare(String(idB));
    });

    return idsArray.map((pid) => ({
      playerId: pid,
      ...overall[pid],
    }));
  };

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

  // ------- GROUP_FORMER & GROUPES DESTINATION -------

  const findDestinationGroups = (currentGroupId) => {
    return (allGroups || []).filter((g) => {
      if (!g.group_former) return false;
      try {
        const arr = JSON.parse(g.group_former);
        return (
          Array.isArray(arr) &&
          arr.some(([, srcId]) => Number(srcId) === Number(currentGroupId))
        );
      } catch {
        return false;
      }
    });
  };

  const ensureFormerArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return [];
      }
    }
    return [];
  };

  // ------- JOUEURS : group_id[] -------

  const removeGroupFromPlayerIfPresent = async (playerId, groupIdToRemove) => {
    const p = await apiFetch(`/api/players/${playerId}`, {
      method: "GET",
    });

    const current = Array.isArray(p?.group_id) ? p.group_id : [];
    const next = current.filter(
      (gid) => Number(gid) !== Number(groupIdToRemove)
    );
    if (next.length === current.length) return;

    await apiFetch(`/api/players/${playerId}`, {
      method: "PATCH",
      body: JSON.stringify({ group_id: next }),
    });
  };

  const fetchPlayersHavingGroupId = async (groupId) => {
    const data = await apiFetch(`/api/players?groupId=${Number(groupId)}`, {
      method: "GET",
    });
    return data || [];
  };

  const addGroupToPlayerIfMissing = async (playerId, newGroupId) => {
    const p = await apiFetch(`/api/players/${playerId}`, {
      method: "GET",
    });

    const current = Array.isArray(p?.group_id) ? p.group_id : [];
    const already = current.map(String).includes(String(newGroupId));
    if (already) return;

    const next = [...current, newGroupId];

    await apiFetch(`/api/players/${playerId}`, {
      method: "PATCH",
      body: JSON.stringify({ group_id: next }),
    });
  };

  // ------- SYNCHRO D'UN GROUPE CIBLE -------

  const fillScheduledMatchesForGroup = async (destGroupId) => {
    const destGroup = (allGroups || []).find(
      (g) => Number(g.id) === Number(destGroupId)
    );
    if (!destGroup) return;

    const former = ensureFormerArray(destGroup.group_former);
    if (!former.length) return;

    const desiredByPosition = new Map();
    const desiredGlobal = new Set();

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

    const mlist =
      (await apiFetch(`/api/groups/${destGroupId}/matches`, {
        method: "GET",
      })) || [];

    const matchUpdatePromises = [];

    const computeExpectedPlayer = (groupPos) => {
      if (!groupPos) return null;
      const idx = Number(groupPos) - 1;
      const entry = former[idx];
      if (!entry || !Array.isArray(entry) || entry.length < 2) return null;
      const desired = desiredByPosition.get(idx) ?? null;
      return desired || null;
    };

    for (const m of mlist || []) {
      const expectedP1 = computeExpectedPlayer(m.player1_group_position);
      const expectedP2 = computeExpectedPlayer(m.player2_group_position);
      const patch = {};
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

    await Promise.all(
      Array.from(desiredGlobal).map((pid) =>
        addGroupToPlayerIfMissing(pid, destGroupId)
      )
    );

    const currentPlayers = await fetchPlayersHavingGroupId(destGroupId);
    const removals = currentPlayers
      .filter((p) => !desiredGlobal.has(p.id))
      .map((p) => removeGroupFromPlayerIfPresent(p.id, destGroupId));
    if (removals.length) await Promise.all(removals);
  };

  // ------- API PUBLIC DU HOOK -------

  const postProcessAfterSave = async (updatedMatch) => {
    const groupId = updatedMatch.group_id;
    const matches = await fetchGroupMatches(groupId);
    const destGroups = findDestinationGroups(groupId);
    if (!destGroups.length) return;

    const complete = matchesAreComplete(matches);
    if (complete) {
      computeRankingFromMatches(matches);
    }

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

  const saveMatch = async (matchId, payload) => {
    const updated = await apiFetch(
      `/api/tournaments/${tournamentId}/matches/${matchId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    return updated;
  };

  return { saveMatch, postProcessAfterSave };
};

export default useMatchRowApi;
