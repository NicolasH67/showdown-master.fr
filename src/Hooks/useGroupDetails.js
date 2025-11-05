import { useMemo } from "react";
import usePlayers from "./usePlayers.js";
import useGroupsData from "./useGroupsData.js";
import useClubs from "./useClub.js";
import useMatches from "./useMatches.js";

/**
 * Agrège toutes les données nécessaires pour la page de détails d'un groupe.
 * - Récupère players, groups, clubs, matches via les hooks globaux
 * - Isole le groupe courant (groupId)
 * - Filtre les joueurs appartenant au groupe (player.group_id est un int[])
 * - Filtre les matchs du groupe et normalise player1 / player2 / group / referees
 */
export default function useGroupDetails(tournamentId, groupId) {
  const { players, loading: pl, error: pe } = usePlayers(tournamentId);
  const { groups, loading: gl, error: ge } = useGroupsData(tournamentId);
  const { clubs, loading: cl, error: ce } = useClubs(tournamentId);
  const { matches, loading: ml, error: me } = useMatches(tournamentId);

  // Groupe courant
  const group = useMemo(() => {
    if (!groups || !groupId) return null;
    return groups.find((g) => String(g.id) === String(groupId)) || null;
  }, [groups, groupId]);

  // Index utilitaires pour enrichissement rapide
  const playersById = useMemo(() => {
    const m = new Map();
    (players || []).forEach((p) => m.set(Number(p.id), p));
    return m;
  }, [players]);

  const clubsById = useMemo(() => {
    const m = new Map();
    (clubs || []).forEach((c) => m.set(Number(c.id), c));
    return m;
  }, [clubs]);

  // Joueurs rattachés à ce groupe (player.group_id est un int[])
  const playersOfGroup = useMemo(() => {
    const gid = Number(groupId);
    if (!Number.isFinite(gid)) return [];
    return (players || []).filter(
      (p) => Array.isArray(p.group_id) && p.group_id.includes(gid)
    );
  }, [players, groupId]);

  // Matchs du groupe + enrichissement (conserver le shape attendu par l'UI)
  const matchesOfGroup = useMemo(() => {
    const gid = Number(groupId);
    if (!Number.isFinite(gid)) return [];

    const base = (matches || []).filter((m) => Number(m.group_id) === gid);

    return base.map((m) => {
      // Normalisation des joueurs (compat: API locale vs Vercel)
      const p1Id = Number(m.player1?.id ?? m.player1_id);
      const p2Id = Number(m.player2?.id ?? m.player2_id);
      const p1 = m.player1 || playersById.get(p1Id) || null;
      const p2 = m.player2 || playersById.get(p2Id) || null;

      // Normalisation du groupe et arbitres si disponibles
      const grp = m.group || group || null;
      const r1 = m.referee_1 || m.referee1 || null;
      const r2 = m.referee_2 || m.referee2 || null;

      return {
        ...m,
        player1: p1,
        player2: p2,
        group: grp,
        referee_1: r1,
        referee_2: r2,
      };
    });
  }, [matches, playersById, group, groupId]);

  const loading = pl || gl || cl || ml;
  const error = pe || ge || ce || me || "";

  return {
    group,
    players: playersOfGroup,
    matches: matchesOfGroup,
    allGroups: groups || [],
    allClubs: clubs || [],
    loading,
    error,
    clubsById,
  };
}
