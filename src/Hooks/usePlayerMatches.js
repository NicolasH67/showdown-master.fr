import { useState, useEffect } from "react";
import usePlayers from "./usePlayers";
import useMatches from "./useMatchs";

/**
 * @param {string|number} playerId
 * @param {string|number} [tournamentId]
 */
const usePlayerMatches = (playerId, tournamentId) => {
  const {
    players = [],
    loading: playersLoading,
    error: playersError,
  } = usePlayers(tournamentId);

  const {
    matches = [],
    loading: matchesLoading,
    error: matchesError,
  } = useMatches();

  const [player, setPlayer] = useState(null);
  const [playerMatches, setPlayerMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize en nombre si possible, sinon null
  const toNum = (val) => {
    if (val == null) return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  };

  // Retourne { num, str } où num est un nombre si convertible, sinon null,
  // et str est une string normalisée pour comparaisons de secours.
  const normalizeIdOrString = (val) => {
    if (val == null) return { num: null, str: null };
    if (typeof val === "object") {
      const raw = val?.id ?? null; // jamais d'accès direct sans ?.
      const num = toNum(raw);
      return { num, str: raw != null ? String(raw) : null };
    }
    const num = toNum(val);
    return { num, str: String(val) };
  };

  // Récupère toutes les représentations possibles d’un champ joueur (player1/player2)
  const getCandidateIds = (m, key) => {
    const obj = m?.[key]; // peut être null, id brut, ou objet { id, name, ... }
    const viaObj = normalizeIdOrString(obj);
    const viaObjId = normalizeIdOrString(obj?.id);
    const viaIdField = normalizeIdOrString(m?.[`${key}_id`]);

    // Déduplique proprement
    const seenStr = new Set();
    const add = (candidate) => {
      if (!candidate) return;
      const sig = `${candidate.num ?? "x"}|${candidate.str ?? "x"}`;
      if (!seenStr.has(sig)) seenStr.add(sig);
    };

    [viaObj, viaObjId, viaIdField].forEach(add);

    // Retourne tableau de {num, str}
    return Array.from(seenStr).map((sig) => {
      const [n, s] = sig.split("|");
      return {
        num: n !== "x" ? Number(n) : null,
        str: s !== "x" ? s : null,
      };
    });
  };

  // Date triable -> millisecondes, sinon MAX pour pousser en bas
  const toMillis = (m) => {
    const d = m?.match_day;
    const t = m?.match_time;
    if (!d || !t) return Number.MAX_SAFE_INTEGER;
    const ms = Date.parse(`${d}T${t}`);
    return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
  };

  useEffect(() => {
    if (playersError || matchesError) {
      setError(playersError || matchesError);
      setLoading(false);
      return;
    }

    if (playersLoading || matchesLoading) {
      setLoading(true);
      return;
    }

    try {
      // Normalise l’ID du joueur recherché
      const pidNum = toNum(playerId);
      const pidStr = playerId != null ? String(playerId) : null;

      if (pidNum == null && pidStr == null) {
        setPlayer(null);
        setPlayerMatches([]);
        setLoading(false);
        setError(null);
        return;
      }

      // Sélection du joueur (match sur id numérique si possible, sinon fallback string)
      const foundPlayer =
        (players || []).find((p) => {
          const { num, str } = normalizeIdOrString(p?.id);
          if (pidNum != null && num != null) return num === pidNum;
          if (pidStr != null && str != null) return str === pidStr;
          return false;
        }) || null;

      setPlayer(foundPlayer);

      // Filtre matches: prend si player1 ou player2 correspond
      const filtered = (matches || []).filter((m) => {
        if (!m) return false;

        // Filtre tournoi (n’exclut que si les deux côtés sont renseignés)
        if (
          tournamentId != null &&
          m?.tournament_id != null &&
          String(m.tournament_id) !== String(tournamentId)
        ) {
          return false;
        }

        const c1 = getCandidateIds(m, "player1");
        const c2 = getCandidateIds(m, "player2");

        // Comparaison: priorité au numérique si dispo, sinon string
        const hit = (cands) =>
          cands.some(({ num, str }) => {
            if (pidNum != null && num != null) return num === pidNum;
            if (pidStr != null && str != null) return str === pidStr;
            return false;
          });

        return hit(c1) || hit(c2);
      });

      // Tri chronologique (sans date à la fin)
      filtered.sort((a, b) => toMillis(a) - toMillis(b));

      setPlayerMatches(filtered);
      setError(null);
    } catch (e) {
      setError(e);
      setPlayerMatches([]);
    } finally {
      setLoading(false);
    }
  }, [
    players,
    matches,
    playersLoading,
    matchesLoading,
    playersError,
    matchesError,
    playerId,
    tournamentId,
  ]);

  return { player, matches: playerMatches, loading, error };
};

export default usePlayerMatches;
