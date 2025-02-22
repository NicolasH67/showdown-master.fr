import React from "react";
import { useParams } from "react-router-dom";
import usePlayers from "../../Hooks/usePlayers";
import PlayerTable from "../../Components/PlayerTable/PlayerTable";
import { useTranslation } from "react-i18next";

/**
 * Players Component - Displays a list of players categorized by group type.
 *
 * This component fetches players for a specific tournament using the ID from the URL parameters.
 * Players are categorized into different groups: men, women, team, and mixed.
 *
 * @component
 * @returns {JSX.Element} The rendered Players component.
 */
const Players = () => {
  const { id } = useParams();
  const { players, loading, error } = usePlayers(id);
  const [t, i18n] = useTranslation();

  if (loading) return <div>Chargement des joueurs...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  const malePlayers = players.filter(
    (player) => player.division.group_type === "men"
  );
  const femalePlayers = players.filter(
    (player) => player.division.group_type === "women"
  );
  const teamPlayers = players.filter(
    (player) => player.division.group_type === "team"
  );
  const mixPlayers = players.filter(
    (player) => player.division.group_type === "mix"
  );

  return (
    <div className="container mt-4">
      <h1 className="mb-4">{t("titlePlayersList")}</h1>
      <PlayerTable players={malePlayers} groupType={t("men")} />
      <PlayerTable players={femalePlayers} groupType={t("women")} />
      <PlayerTable players={teamPlayers} groupType={t("team")} />
      <PlayerTable players={mixPlayers} groupType={t("mixed")} />
    </div>
  );
};

export default Players;
