import React from "react";
import { useTranslation } from "react-i18next";

const parseMatch = (match) => {
  if (!match.player1?.id || !match.player2?.id) {
    console.warn("Match mal formé :", match);
    return {
      playerAId: -1,
      playerBId: -1,
      setsA: 0,
      setsB: 0,
      goalsA: 0,
      goalsB: 0,
    };
  }

  let setsA = 0,
    setsB = 0,
    goalsA = 0,
    goalsB = 0;
  const res = match.result || [];

  for (let i = 0; i < res.length; i += 2) {
    const a = res[i];
    const b = res[i + 1];
    if (a > b) setsA += 1;
    else if (b > a) setsB += 1;
    goalsA += a;
    goalsB += b;
  }

  return {
    playerAId: match.player1?.id,
    playerBId: match.player2?.id,
    setsA,
    setsB,
    goalsA,
    goalsB,
  };
};

const computeStats = (players = [], rawMatches = []) => {
  const stats = {};
  players.forEach((p) => {
    stats[p.id] = {
      wins: 0,
      setsWon: 0,
      setsLost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
  });

  rawMatches.forEach((match) => {
    const { playerAId, playerBId, setsA, setsB, goalsA, goalsB } =
      parseMatch(match);

    if (!stats[playerAId] || !stats[playerBId]) return;

    stats[playerAId].setsWon += setsA;
    stats[playerAId].setsLost += setsB;
    stats[playerAId].goalsFor += goalsA;
    stats[playerAId].goalsAgainst += goalsB;

    stats[playerBId].setsWon += setsB;
    stats[playerBId].setsLost += setsA;
    stats[playerBId].goalsFor += goalsB;
    stats[playerBId].goalsAgainst += goalsA;

    if (setsA > setsB) stats[playerAId].wins += 1;
    else if (setsB > setsA) stats[playerBId].wins += 1;
  });

  return stats;
};

const GroupTable = ({ players, matches }) => {
  const { t } = useTranslation();
  const stats = computeStats(players, matches);
  /*
  const sortedPlayers = [...players].sort((a, b) => {
    const pointsA = stats[a.id]?.wins || 0;
    const pointsB = stats[b.id]?.wins || 0;
    return pointsB - pointsA;
  });
  */

  const getDirectStats = (playersSubset, matchesSubset) => {
    const ids = playersSubset.map((p) => p.id);
    const filteredMatches = matchesSubset.filter((m) => {
      const a = m.player1?.id;
      const b = m.player2?.id;
      return ids.includes(a) && ids.includes(b);
    });
    return computeStats(playersSubset, filteredMatches);
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const pa = stats[a.id];
    const pb = stats[b.id];
    if (pb.wins !== pa.wins) return pb.wins - pa.wins;

    // égalité détectée
    const tiedPlayers = players.filter((p) => stats[p.id].wins === pa.wins);
    if (tiedPlayers.length === 2 || tiedPlayers.length === 3) {
      const subStats = getDirectStats(tiedPlayers, matches);
      const sa = subStats[a.id];
      const sb = subStats[b.id];

      const setDiffA = sa.setsWon - sa.setsLost;
      const setDiffB = sb.setsWon - sb.setsLost;
      if (setDiffA !== setDiffB) return setDiffB - setDiffA;

      const goalDiffA = sa.goalsFor - sa.goalsAgainst;
      const goalDiffB = sb.goalsFor - sb.goalsAgainst;
      if (goalDiffA !== goalDiffB) return goalDiffB - goalDiffA;
    }

    // Tirage au sort si égalité persistante
    return a.lastname.localeCompare(b.lastname);
  });

  return (
    <table className="table table-bordered">
      <thead>
        <tr>
          <th>{t("ranking")}</th>
          <th>{t("name")}</th>
          <th>{t("point")}</th>
          <th>{t("set")}</th>
          <th>{t("goal")}</th>
        </tr>
      </thead>
      <tbody>
        {players.length > 0 ? (
          sortedPlayers.map((player, index) => {
            const stat = stats[player.id];
            const setDiff = stat.setsWon - stat.setsLost;
            const goalDiff = stat.goalsFor - stat.goalsAgainst;

            return (
              <tr key={player.id}>
                <td>{index + 1}</td>
                <td>
                  {player.firstname} {player.lastname}
                </td>
                <td>{stat.wins}</td>
                <td>
                  {setDiff} ({stat.setsWon}:{stat.setsLost})
                </td>
                <td>
                  {goalDiff} ({stat.goalsFor}:{stat.goalsAgainst})
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan="5" className="text-center">
              {t("messageNoPlayersInGroup")}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default GroupTable;
