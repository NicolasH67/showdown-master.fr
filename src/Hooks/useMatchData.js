import { useMemo } from "react";
import { useParams } from "react-router-dom";

// Hooks existants (même dossier)
import usePlayers from "./usePlayers";
import useGroupsData from "./useGroupsData";
import useMatchs from "./useMatchs";
import useClub from "./useClub";

/**
 * useMatchData (composition)
 * - N'appelle plus d'API directement : agrège les données depuis
 *   usePlayers, useGroupsData, useMatchs, useClubs.
 * - Normalise le format de sortie pour les consommateurs existants:
 *   { groups, players, matches, clubs, loading, error }
 *     - groups: array
 *     - players: { [group_id]: Player[] }
 *     - matches: { [group_id]: Match[] }
 *     - clubs:   { [club_id]: abbreviation | name }
 */
const useMatchData = () => {
  const { id } = useParams();
  const tournamentId = Number(id);

  // Appels via les hooks spécialisés
  const {
    players: playersRaw,
    loading: loadingPlayers,
    error: errorPlayers,
  } = usePlayers(tournamentId);

  const {
    groups: groupsRaw,
    loading: loadingGroups,
    error: errorGroups,
  } = useGroupsData(tournamentId);

  const {
    matches: matchesRaw,
    loading: loadingMatches,
    error: errorMatches,
  } = useMatchs(tournamentId);

  const {
    clubs: clubsRaw,
    loading: loadingClubs,
    error: errorClubs,
  } = useClub(tournamentId);

  // Agrégation des états
  const loading =
    loadingPlayers || loadingGroups || loadingMatches || loadingClubs;

  const error =
    errorPlayers ||
    errorGroups ||
    errorMatches ||
    errorClubs ||
    (!Number.isFinite(tournamentId) || tournamentId <= 0
      ? new Error("Invalid tournament id")
      : null);

  // Normalisations -----------------------------------------------------------

  // groups: tel quel (tableau)
  const groups = useMemo(() => {
    if (!Array.isArray(groupsRaw)) return [];
    return groupsRaw;
  }, [groupsRaw]);

  // clubs: tableau -> map { id: abbrOrName }
  const clubs = useMemo(() => {
    if (!clubsRaw) return {};
    // si c'est déjà un dictionnaire, on le renvoie
    if (!Array.isArray(clubsRaw) && typeof clubsRaw === "object")
      return clubsRaw;

    const map = {};
    if (Array.isArray(clubsRaw)) {
      for (const c of clubsRaw) {
        if (!c || c.id == null) continue;
        map[c.id] = c.abbreviation || c.name || String(c.id);
      }
    }
    return map;
  }, [clubsRaw]);

  // players: si tableau -> groupé par group_id
  const players = useMemo(() => {
    // déjà groupé ?
    if (
      playersRaw &&
      !Array.isArray(playersRaw) &&
      typeof playersRaw === "object"
    ) {
      return playersRaw; // { [gid]: Player[] }
    }
    const byGroup = {};
    const arr = Array.isArray(playersRaw) ? playersRaw : [];
    for (const p of arr) {
      if (!p) continue;
      const gid = Array.isArray(p.group_id) ? p.group_id[0] : p.group_id;
      if (gid == null) continue;
      (byGroup[gid] = byGroup[gid] || []).push(p);
    }
    return byGroup;
  }, [playersRaw]);

  // matches: si tableau -> groupé par group_id
  const matches = useMemo(() => {
    if (
      matchesRaw &&
      !Array.isArray(matchesRaw) &&
      typeof matchesRaw === "object"
    ) {
      return matchesRaw; // { [gid]: Match[] }
    }
    const byGroup = {};
    const arr = Array.isArray(matchesRaw) ? matchesRaw : [];
    for (const m of arr) {
      if (!m || m.group_id == null) continue;
      (byGroup[m.group_id] = byGroup[m.group_id] || []).push(m);
    }
    return byGroup;
  }, [matchesRaw]);

  return { groups, players, matches, clubs, loading, error };
};

export default useMatchData;
