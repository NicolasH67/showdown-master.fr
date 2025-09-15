// src/Utils/getDirectStats.js
import { toResultPairs } from "../Helpers/matchUtils";

/**
 * Calcule les stats (victoires, sets, buts) uniquement
 * sur les confrontations directes entre un sous-ensemble de joueurs.
 *
 * @param {Array} playersSubset - liste de joueurs ({id, ...})
 * @param {Array} matchesSubset - liste de matchs ({player1_id, player2_id, result})
 * @returns {Object} { [playerId]: { wins, setsWon, setsLost, goalsFor, goalsAgainst } }
 */
export default function getDirectStats(playersSubset, matchesSubset) {
  const stats = {};
  const ids = playersSubset.map((p) => Number(p.id)).filter(Number.isFinite);

  ids.forEach((pid) => {
    stats[pid] = {
      wins: 0,
      setsWon: 0,
      setsLost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
  });

  matchesSubset.forEach((m) => {
    const aId = Number(m.player1_id ?? m.player1?.id);
    const bId = Number(m.player2_id ?? m.player2?.id);

    if (!ids.includes(aId) || !ids.includes(bId)) return;

    const resultPairs = toResultPairs(m.result);
    if (!resultPairs.length) return;

    let setsA = 0,
      setsB = 0,
      goalsA = 0,
      goalsB = 0;

    for (let i = 0; i + 1 < resultPairs.length; i += 2) {
      const a = Number(resultPairs[i] ?? 0);
      const b = Number(resultPairs[i + 1] ?? 0);
      if (a > b) setsA += 1;
      else if (b > a) setsB += 1;
      goalsA += a;
      goalsB += b;
    }

    stats[aId].setsWon += setsA;
    stats[aId].setsLost += setsB;
    stats[aId].goalsFor += goalsA;
    stats[aId].goalsAgainst += goalsB;

    stats[bId].setsWon += setsB;
    stats[bId].setsLost += setsA;
    stats[bId].goalsFor += goalsB;
    stats[bId].goalsAgainst += goalsA;

    if (setsA > setsB) {
      stats[aId].wins += 1;
    } else if (setsB > setsA) {
      stats[bId].wins += 1;
    } else {
      // égalité en sets : départage aux buts
      if (goalsA > goalsB) stats[aId].wins += 1;
      else if (goalsB > goalsA) stats[bId].wins += 1;
    }
  });

  return stats;
}
