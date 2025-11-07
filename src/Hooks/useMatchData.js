import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { get, ApiError } from "../Helpers/apiClient";

/**
 * useMatchData – version alignée avec les autres hooks (API côté backend)
 *
 * - Ne parle plus directement à Supabase depuis le front.
 * - Utilise les routes unifiées `/api/tournaments/:id/...` avec un fallback robuste
 *   (ex: `/api/tournaments/players?id=...`) comme les autres hooks.
 * - Structure de retour inchangée: { groups, players, matches, clubs, loading, error }
 */
const useMatchData = () => {
  const { t } = useTranslation();
  const { id } = useParams();

  const [groups, setGroups] = useState([]);
  const [players, setPlayers] = useState({}); // { [group_id]: Player[] }
  const [matches, setMatches] = useState({}); // { [group_id]: Match[] }
  const [clubs, setClubs] = useState({}); // { [club_id]: abbreviation }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setGroups([]);
      setPlayers({});
      setMatches({});
      setClubs({});

      const idNum = Number(id);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        if (!cancelled) {
          setError(
            new Error(
              t("tournamentNotFound", { defaultValue: "Invalid tournament id" })
            )
          );
          setLoading(false);
        }
        return;
      }

      // Essaie une liste d'URLs et renvoie le premier JSON OK
      const firstOk = async (paths) => {
        const errors = [];
        for (const p of paths) {
          try {
            const r = await get(p);
            if (r !== undefined && r !== null) return r;
          } catch (e) {
            // log + continue
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                "[useMatchData] endpoint failed:",
                p,
                e?.status || e?.message || e
              );
            }
            errors.push(e);
            continue;
          }
        }
        if (errors.length) throw errors[errors.length - 1];
        throw new ApiError("not_found", { status: 404, body: null });
      };

      try {
        // 1) Groups
        const groupsResp = await firstOk([`/api/tournaments/${idNum}/groups`]);
        const groupsArr = Array.isArray(groupsResp)
          ? groupsResp
          : Array.isArray(groupsResp?.groups)
          ? groupsResp.groups
          : [];

        // 2) Players
        const playersResp = await firstOk([
          `/api/tournaments/${idNum}/players`,
          `/api/tournaments/players?id=${idNum}`,
        ]);
        const playersArr = Array.isArray(playersResp)
          ? playersResp
          : Array.isArray(playersResp?.players)
          ? playersResp.players
          : [];

        // 3) Matches
        const matchesResp = await firstOk([
          `/api/tournaments/${idNum}/matches`,
        ]);
        const matchesArr = Array.isArray(matchesResp)
          ? matchesResp
          : Array.isArray(matchesResp?.matches)
          ? matchesResp.matches
          : [];

        // 4) Clubs
        const clubsResp = await firstOk([
          `/api/tournaments/${idNum}/clubs`,
          `/api/tournaments/${idNum}/club`,
        ]);
        const clubsArr = Array.isArray(clubsResp)
          ? clubsResp
          : Array.isArray(clubsResp?.clubs)
          ? clubsResp.clubs
          : [];

        // Normalisations
        const clubsMap = {};
        for (const c of clubsArr) {
          if (!c || c.id == null) continue;
          clubsMap[c.id] = c.abbreviation || c.name || String(c.id);
        }

        const playersByGroup = playersArr.reduce((acc, p) => {
          if (!p) return acc;
          // group_id peut être un nombre ou un tableau; on prend le 1er si tableau
          const gid = Array.isArray(p.group_id) ? p.group_id[0] : p.group_id;
          if (gid == null) return acc;
          (acc[gid] = acc[gid] || []).push(p);
          return acc;
        }, {});

        const matchesByGroup = matchesArr.reduce((acc, m) => {
          if (!m || m.group_id == null) return acc;
          (acc[m.group_id] = acc[m.group_id] || []).push(m);
          return acc;
        }, {});

        if (!cancelled) {
          setGroups(groupsArr);
          setPlayers(playersByGroup);
          setMatches(matchesByGroup);
          setClubs(clubsMap);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  return { groups, players, matches, clubs, loading, error };
};

export default useMatchData;
