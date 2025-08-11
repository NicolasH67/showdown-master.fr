import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

const PlayerStats = ({ player = { id: null }, matches = [] }) => {
  const { t } = useTranslation();
  const playerId = player?.id ?? player?.player_id ?? null;

  // Helpers sûrs
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const asArray = (v) => (Array.isArray(v) ? v : []);

  // Récupère les ids des deux joueurs quelle que soit la forme du match
  const getP1Id = (m) => m?.player1?.id ?? m?.player1_id ?? null;
  const getP2Id = (m) => m?.player2?.id ?? m?.player2_id ?? null;

  // Extrait le tableau de scores set par set: [p1s1, p2s1, p1s2, p2s2, ...]
  const getResultPairs = (m) => asArray(m?.result).filter(isNum);

  // Un match est "terminé" si au moins un set est saisi (2 valeurs = 1 set)
  const isCompleted = (m) => getResultPairs(m).length >= 2;

  const myMatches = useMemo(() => {
    if (!playerId) return [];
    return (Array.isArray(matches) ? matches : []).filter((m) => {
      const p1 = getP1Id(m);
      const p2 = getP2Id(m);
      return p1 === playerId || p2 === playerId;
    });
  }, [matches, playerId]);

  const completed = useMemo(() => myMatches.filter(isCompleted), [myMatches]);

  const agg = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let setsWon = 0;
    let setsLost = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    for (const m of myMatches) {
      const p1Id = getP1Id(m);
      const p2Id = getP2Id(m);
      const iAmP1 = p1Id === playerId;
      const iAmP2 = p2Id === playerId;
      if (!iAmP1 && !iAmP2) continue; // sécurité

      const res = getResultPairs(m);
      let setsP1 = 0;
      let setsP2 = 0;
      let ptsP1 = 0;
      let ptsP2 = 0;

      for (let i = 0; i < res.length; i += 2) {
        const s1 = isNum(res[i]) ? res[i] : 0;
        const s2 = isNum(res[i + 1]) ? res[i + 1] : 0;
        ptsP1 += s1;
        ptsP2 += s2;
        if (s1 > s2) setsP1 += 1;
        else if (s2 > s1) setsP2 += 1;
        // égalités ignorées (set non valide)
      }

      if (iAmP1) {
        setsWon += setsP1;
        setsLost += setsP2;
        pointsFor += ptsP1;
        pointsAgainst += ptsP2;
      } else if (iAmP2) {
        setsWon += setsP2;
        setsLost += setsP1;
        pointsFor += ptsP2;
        pointsAgainst += ptsP1;
      }

      // Victoire/défaite uniquement si match complété
      if (res.length >= 2) {
        const didP1Win = setsP1 > setsP2;
        const didP2Win = setsP2 > setsP1;
        if (iAmP1 && didP1Win) wins += 1;
        else if (iAmP1 && didP2Win) losses += 1;
        else if (iAmP2 && didP2Win) wins += 1;
        else if (iAmP2 && didP1Win) losses += 1;
      }
    }

    const completedCount = completed.length;
    const winPct =
      completedCount > 0 ? ((wins / completedCount) * 100).toFixed(2) : "0.00";
    const lossPct =
      completedCount > 0
        ? (((completedCount - wins) / completedCount) * 100).toFixed(2)
        : "0.00";
    const totalSets = setsWon + setsLost;
    const setWinRate =
      totalSets > 0 ? ((setsWon / totalSets) * 100).toFixed(2) : "0.00";

    return {
      totalMatches: myMatches.length,
      completedMatches: completedCount,
      wins,
      losses,
      winPct,
      lossPct,
      setsWon,
      setsLost,
      pointsFor,
      pointsAgainst,
      setWinRate,
    };
  }, [myMatches, completed.length, playerId]);

  return (
    <div>
      <h3>{t("statistics")}</h3>
      <p>
        <strong>{t("totalMatches")}:</strong> {agg.totalMatches}
      </p>
      <p>
        <strong>{t("wins")}:</strong> {agg.wins} ({agg.winPct}%)
      </p>
      <p>
        <strong>{t("losses")}:</strong> {agg.losses} ({agg.lossPct}%)
      </p>
      <p>
        <strong>{t("setsWon")}:</strong> {agg.setsWon}
      </p>
      <p>
        <strong>{t("setsLost")}:</strong> {agg.setsLost}
      </p>
      <p>
        <strong>{t("setWinRate")}:</strong> {agg.setWinRate}%
      </p>
      <p>
        <strong>{t("pointsScored")}:</strong> {agg.pointsFor}
      </p>
      <p>
        <strong>{t("pointsConceded")}:</strong> {agg.pointsAgainst}
      </p>
      <p>
        <em>{t("completedMatches", "Completed matches")}:</em>{" "}
        {agg.completedMatches}
      </p>
    </div>
  );
};

export default PlayerStats;
