import { useTranslation } from "react-i18next";

const PlayerStats = () => {
  // Données fictives pour le joueur
  const player = {
    id: 1,
    wins: 12,
    losses: 5,
  };

  // Données fictives pour les matchs
  const matches = [
    {
      id: 1,
      result: "win",
      player1_id: 1,
      player2_id: 2,
      sets_won_player1: 3,
      sets_lost_player1: 0,
      points_player1: 15,
      points_player2: 10,
    },
    {
      id: 2,
      result: "loss",
      player1_id: 1,
      player2_id: 3,
      sets_won_player1: 1,
      sets_lost_player1: 3,
      points_player1: 8,
      points_player2: 12,
    },
    {
      id: 3,
      result: "win",
      player1_id: 1,
      player2_id: 4,
      sets_won_player1: 3,
      sets_lost_player1: 1,
      points_player1: 16,
      points_player2: 12,
    },
  ];

  const { t } = useTranslation();

  const calculateWinPercentage = () => {
    const total = player.wins + player.losses;
    return total > 0 ? ((player.wins / total) * 100).toFixed(2) : 0;
  };

  const calculateLossPercentage = () => {
    const total = player.wins + player.losses;
    return total > 0 ? ((player.losses / total) * 100).toFixed(2) : 0;
  };

  const calculateSetsWon = () => {
    return matches.reduce((acc, match) => {
      if (match.result === "win" && match.player1_id === player.id) {
        return acc + match.sets_won_player1;
      } else if (match.result === "win" && match.player2_id === player.id) {
        return acc + match.sets_won_player2;
      }
      return acc;
    }, 0);
  };

  const calculateSetsLost = () => {
    return matches.reduce((acc, match) => {
      if (match.result === "loss" && match.player1_id === player.id) {
        return acc + match.sets_lost_player1;
      } else if (match.result === "loss" && match.player2_id === player.id) {
        return acc + match.sets_lost_player2;
      }
      return acc;
    }, 0);
  };

  const calculatePointsScored = () => {
    return matches.reduce((acc, match) => {
      if (match.player1_id === player.id) {
        return acc + match.points_player1;
      } else if (match.player2_id === player.id) {
        return acc + match.points_player2;
      }
      return acc;
    }, 0);
  };

  const calculatePointsConceded = () => {
    return matches.reduce((acc, match) => {
      if (match.player1_id === player.id) {
        return acc + match.points_player2;
      } else if (match.player2_id === player.id) {
        return acc + match.points_player1;
      }
      return acc;
    }, 0);
  };

  const calculateSetWinRate = () => {
    const totalSets = calculateSetsWon() + calculateSetsLost();
    return totalSets > 0
      ? ((calculateSetsWon() / totalSets) * 100).toFixed(2)
      : 0;
  };

  return (
    <div>
      <h3>{t("statistics")}</h3>
      <p>
        <strong>{t("totalMatches")}:</strong> {matches.length}
      </p>
      <p>
        <strong>{t("wins")}:</strong> {player.wins} ({calculateWinPercentage()}
        %)
      </p>
      <p>
        <strong>{t("losses")}:</strong> {player.losses} (
        {calculateLossPercentage()}%)
      </p>
      <p>
        <strong>{t("setsWon")}:</strong> {calculateSetsWon()}
      </p>
      <p>
        <strong>{t("setsLost")}:</strong> {calculateSetsLost()}
      </p>
      <p>
        <strong>{t("pointsScored")}:</strong> {calculatePointsScored()}
      </p>
      <p>
        <strong>{t("pointsConceded")}:</strong> {calculatePointsConceded()}
      </p>
      <p>
        <strong>{t("setWinRate")}:</strong> {calculateSetWinRate()}%
      </p>
    </div>
  );
};

export default PlayerStats;
