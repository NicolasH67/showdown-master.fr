import { useMemo, useCallback } from "react";
import usePlayers from "./usePlayers";
import useGroupsData from "./useGroupsData";
import useClub from "./useClub";
import useMatches from "./useMatchs";

// Re-expose the parser in case consumers still use it somewhere
const toResultPairs = (res) => {
  if (!res) return [];
  if (Array.isArray(res))
    return res.map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));
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

export default function useRankingData() {
  // Délègue la récupération des données aux hooks existants
  const {
    players,
    loading: loadingPlayers,
    error: errorPlayers,
    refresh: refreshPlayers,
  } = usePlayers();

  const {
    groups,
    loading: loadingGroups,
    error: errorGroups,
    refresh: refreshGroups,
  } = useGroupsData();

  const {
    clubs,
    loading: loadingClubs,
    error: errorClubs,
    refresh: refreshClubs,
  } = useClub();

  const {
    matches,
    loading: loadingMatches,
    error: errorMatches,
    refresh: refreshMatches,
  } = useMatches();

  // Compose des états globaux
  const loading =
    loadingPlayers || loadingGroups || loadingClubs || loadingMatches;
  const error =
    errorPlayers || errorGroups || errorClubs || errorMatches || null;

  const refresh = useCallback(async () => {
    // Lance les refresh en parallèle; on ne bloque pas si l'un échoue
    await Promise.allSettled([
      refreshPlayers?.(),
      refreshGroups?.(),
      refreshClubs?.(),
      refreshMatches?.(),
    ]);
  }, [refreshPlayers, refreshGroups, refreshClubs, refreshMatches]);

  // Mémo pour éviter les re-render inutiles
  const value = useMemo(
    () => ({
      groups: groups || [],
      players: players || [],
      clubs: clubs || [],
      matches: matches || [],
      loading,
      error,
      refresh,
      toResultPairs, // exposé pour compatibilité
    }),
    [groups, players, clubs, matches, loading, error, refresh]
  );

  return value;
}
