import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { get, ApiError } from "../Helpers/apiClient";

// Try endpoints in order; return first successful JSON
const firstOk = async (paths) => {
  let lastErr = null;
  for (const p of paths) {
    try {
      const json = await get(p);
      return json;
    } catch (e) {
      lastErr = e;
      if (e?.status !== 404) {
        // continue to next fallback; 404 means try next path
      }
    }
  }
  throw lastErr || new Error("All endpoints failed");
};

// Normalize various result formats to a flat pairs array: [a1,b1,a2,b2,...]
const toResultPairs = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) {
    return res.map((n) => {
      const v = Number(n);
      return Number.isFinite(v) ? v : 0;
    });
  }
  if (typeof res === "object" && Array.isArray(res.sets)) {
    const pairs = [];
    for (const s of res.sets) {
      const a = Number(s?.p1);
      const b = Number(s?.p2);
      pairs.push(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
    }
    return pairs;
  }
  if (typeof res === "string") {
    try {
      const parsed = JSON.parse(res);
      return toResultPairs(parsed);
    } catch (_) {
      const chunks = res
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const pairs = [];
      for (const ch of chunks) {
        const m = ch.match(/^(\d+)\s*[-:\/]\s*(\d+)$/);
        if (m) {
          const a = Number(m[1]);
          const b = Number(m[2]);
          pairs.push(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
        }
      }
      return pairs;
    }
  }
  return [];
};

// Optional richer normalization if you need an object form later
const normalizeResultObject = (raw) => {
  const pairs = toResultPairs(raw);
  let p1Sets = 0,
    p2Sets = 0,
    p1Pts = 0,
    p2Pts = 0;
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const a = pairs[i];
    const b = pairs[i + 1];
    if (a > b) p1Sets += 1;
    else if (b > a) p2Sets += 1;
    p1Pts += a;
    p2Pts += b;
  }
  return {
    sets: pairs.reduce((acc, _, i) => {
      if (i % 2 === 0) acc.push({ p1: pairs[i], p2: pairs[i + 1] ?? 0 });
      return acc;
    }, []),
    p1Sets,
    p2Sets,
    p1Points: p1Pts,
    p2Points: p2Pts,
    winner: p1Sets > p2Sets ? "player1" : p2Sets > p1Sets ? "player2" : null,
    finished: pairs.length > 0,
  };
};

const normalizeMatch = (m) => {
  const player1_id = Number(m.player1_id ?? m.player1?.id);
  const player2_id = Number(m.player2_id ?? m.player2?.id);
  const group_id = Number(m.group_id ?? m.group?.id);
  return {
    ...m,
    player1_id: Number.isFinite(player1_id) ? player1_id : undefined,
    player2_id: Number.isFinite(player2_id) ? player2_id : undefined,
    group_id: Number.isFinite(group_id) ? group_id : undefined,
    result_pairs: toResultPairs(m.result),
    result_obj: normalizeResultObject(m.result),
  };
};

export default function useRankingData() {
  const { id } = useParams();
  const [groups, setGroups] = useState([]);
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (tid) => {
    const idNum = Number(tid);
    if (!Number.isFinite(idNum) || idNum <= 0)
      throw new Error("Invalid tournament id");

    // 1) Groups
    const gData = await firstOk([`/api/tournaments/${idNum}/groups`]);
    // 2) Players
    const pData = await firstOk([`/api/tournaments/${idNum}/players`]);
    // 3) Clubs
    const cData = await firstOk([`/api/tournaments/${idNum}/clubs`]);
    // 4) Matches
    const mData = await firstOk([`/api/tournaments/${idNum}/matches`]);

    const groupsArr = Array.isArray(gData) ? gData : [];
    const pArr = Array.isArray(pData) ? pData : [];
    const cArr = Array.isArray(cData) ? cData : [];
    const mArr = (Array.isArray(mData) ? mData : []).map(normalizeMatch);

    return {
      groups: groupsArr,
      players: pArr,
      clubs: cArr,
      matches: mArr,
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await load(id);
      setGroups(data.groups);
      setPlayers(data.players);
      setClubs(data.clubs);
      setMatches(data.matches);
      setLoading(false);
    } catch (e) {
      setError(e?.message || String(e));
      setLoading(false);
    }
  }, [id, load]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await load(id);
        if (!alive) return;
        setGroups(data.groups);
        setPlayers(data.players);
        setClubs(data.clubs);
        setMatches(data.matches);
        if (typeof window !== "undefined") {
          console.debug("[useRankingData] groups:", data.groups);
          console.debug("[useRankingData] players:", data.players?.length);
          console.debug("[useRankingData] matches:", data.matches?.length);
        }
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || String(e));
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, load]);

  return {
    groups,
    players,
    clubs,
    matches,
    loading,
    error,
    refresh,
    // expose helpers if consumers want them
    toResultPairs,
  };
}
