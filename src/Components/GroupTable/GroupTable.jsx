import React from "react";
import { useTranslation } from "react-i18next";

// Normalize various result formats to a flat pairs array: [a1,b1,a2,b2,...]
const toResultPairs = (res) => {
  if (!res) return [];
  // Already an array of numbers (or strings)
  if (Array.isArray(res)) {
    return res.map((n) => {
      const v = Number(n);
      return Number.isFinite(v) ? v : 0;
    });
  }
  // Object form { sets: [{p1, p2}, ...] }
  if (typeof res === "object" && Array.isArray(res.sets)) {
    const pairs = [];
    for (const s of res.sets) {
      const a = Number(s?.p1);
      const b = Number(s?.p2);
      pairs.push(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
    }
    return pairs;
  }
  // String form: try JSON, else parse patterns like "11-6;11-9" or "11-6, 11-9"
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

const parseMatch = (match) => {
  // Coerce player ids from either nested objects or flat *_id fields
  const aId = Number(match.player1?.id ?? match.player1_id);
  const bId = Number(match.player2?.id ?? match.player2_id);

  if (!Number.isFinite(aId) || !Number.isFinite(bId)) {
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
  const res = toResultPairs(match.result);

  for (let i = 0; i < res.length; i += 2) {
    const a = res[i];
    const b = res[i + 1];
    if (a > b) setsA += 1;
    else if (b > a) setsB += 1;
    goalsA += a;
    goalsB += b;
  }

  return {
    playerAId: aId,
    playerBId: bId,
    setsA,
    setsB,
    goalsA,
    goalsB,
  };
};

const computeStats = (players = [], rawMatches = []) => {
  const stats = {};
  players.forEach((p) => {
    const pid = Number(p.id);
    if (!Number.isFinite(pid)) return;
    stats[pid] = {
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

const GroupTable = ({ players, matches, group, allGroups }) => {
  const { t } = useTranslation();
  console.log("[GroupTable] sample result:", matches?.[0]?.result);
  const stats = computeStats(players, matches);

  const getDirectStats = (playersSubset, matchesSubset) => {
    const ids = playersSubset.map((p) => Number(p.id)).filter(Number.isFinite);
    const filteredMatches = matchesSubset.filter((m) => {
      const a = Number(m.player1?.id ?? m.player1_id);
      const b = Number(m.player2?.id ?? m.player2_id);
      return (
        Number.isFinite(a) &&
        Number.isFinite(b) &&
        ids.includes(a) &&
        ids.includes(b)
      );
    });
    return computeStats(playersSubset, filteredMatches);
  };

  const hasResults = matches.some((m) => toResultPairs(m.result).length > 0);

  const sortedPlayers = [...players].sort((a, b) => {
    if (!hasResults) return a.id - b.id;

    const pa = stats[Number(a.id)] || {
      wins: 0,
      setsWon: 0,
      setsLost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
    const pb = stats[Number(b.id)] || {
      wins: 0,
      setsWon: 0,
      setsLost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
    if (pb.wins !== pa.wins) return pb.wins - pa.wins;

    const tiedPlayers = players.filter(
      (p) => (stats[Number(p.id)]?.wins || 0) === pa.wins
    );
    if (tiedPlayers.length === 2 || tiedPlayers.length === 3) {
      const subStats = getDirectStats(tiedPlayers, matches);
      const sa = subStats[Number(a.id)] || {
        setsWon: 0,
        setsLost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };
      const sb = subStats[Number(b.id)] || {
        setsWon: 0,
        setsLost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };

      const setDiffA = sa.setsWon - sa.setsLost;
      const setDiffB = sb.setsWon - sb.setsLost;
      if (setDiffA !== setDiffB) return setDiffB - setDiffA;

      const goalDiffA = sa.goalsFor - sa.goalsAgainst;
      const goalDiffB = sb.goalsFor - sb.goalsAgainst;
      if (goalDiffA !== goalDiffB) return goalDiffB - goalDiffA;
    }

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
            const stat = stats[Number(player.id)] || {
              wins: 0,
              setsWon: 0,
              setsLost: 0,
              goalsFor: 0,
              goalsAgainst: 0,
            };
            const setDiff = stat.setsWon - stat.setsLost;
            const goalDiff = stat.goalsFor - stat.goalsAgainst;

            return (
              <tr key={player.id}>
                <td>{index + 1}</td>
                <td>
                  {player.lastname} {player.firstname}
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
        ) : group?.group_former ? (
          (() => {
            let parsedFormer = [];
            try {
              parsedFormer = Array.isArray(group.group_former)
                ? group.group_former
                : JSON.parse(group.group_former);
            } catch (err) {
              console.error("Erreur parsing group_former", err);
            }

            return parsedFormer.map(([position, groupId], index) => {
              const sourceGroup = allGroups?.find(
                (g) => Number(g.id) === Number(groupId)
              );
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    {sourceGroup
                      ? `${sourceGroup.name}(${position})`
                      : `?(${position})`}
                  </td>
                  <td colSpan="3" className="text-center">
                    —
                  </td>
                </tr>
              );
            });
          })()
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
