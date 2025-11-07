// src/Hooks/useTournamentData.js
import { useMemo } from "react";

// ⬇️ On réutilise tes hooks de données (qui gèrent Vercel/local & API fallback)
import usePlayers from "./usePlayers";
import useGroupsData from "./useGroupsData";
import useClub from "./useClub";
import useReferee from "./useReferee";

/**
 * Agrège les données du tournoi en s'appuyant sur les hooks dédiés
 * (au lieu d'interroger Supabase directement ici).
 *
 * API de retour conservée :
 *  - groups, clubs, players, playersWithGroups, referees, loading, error
 *
 * Note : `refreshTrigger` est supporté en dépendance via les hooks enfants
 * s'ils l'acceptent ; sinon il n'a pas d'effet.
 */
const useTournamentData = (tournamentId, refreshTrigger) => {
  // Données de base
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
  } = useGroupsData(tournamentId, refreshTrigger);

  const {
    clubs,
    loading: clubsLoading,
    error: clubsError,
  } = useClub(tournamentId, refreshTrigger);

  const {
    players,
    loading: playersLoading,
    error: playersError,
  } = usePlayers(tournamentId, refreshTrigger);

  const {
    referees,
    loading: refereesLoading,
    error: refereesError,
  } = useReferee(tournamentId, refreshTrigger);

  // Loading global = au moins un en cours
  const loading =
    !!groupsLoading || !!clubsLoading || !!playersLoading || !!refereesLoading;

  // Premier error non nul
  const error =
    playersError || groupsError || clubsError || refereesError || null;

  // Enrichissement : playersWithGroups => ajoute "groupNames" (liste des noms de groupes du joueur)
  const playersWithGroups = useMemo(() => {
    if (!Array.isArray(players) || players.length === 0) return [];
    const groupsById = new Map(
      (Array.isArray(groups) ? groups : []).map((g) => [g.id, g])
    );

    return players.map((p) => {
      const ids = Array.isArray(p.group_id) ? p.group_id : [];
      const names = ids
        .map((gid) => groupsById.get(gid)?.name)
        .filter(Boolean)
        .join(", ");
      return { ...p, groupNames: names };
    });
  }, [players, groups]);

  return {
    groups,
    clubs,
    players,
    playersWithGroups,
    referees,
    loading,
    error,
  };
};

export default useTournamentData;
