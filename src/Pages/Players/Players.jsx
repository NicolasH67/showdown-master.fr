import React, { useState } from "react";
import { useParams } from "react-router-dom";
import usePlayers from "../../Hooks/usePlayers";
import PlayerTable from "../../Components/PlayerTable/PlayerTable";
import { useTranslation } from "react-i18next";
import PlayerSelector from "../../Components/PlayerSelector/PlayerSelector"; // Import du nouveau sélecteur

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
  const [selectedGroup, setSelectedGroup] = useState(null); // État pour le groupe sélectionné
  const { t } = useTranslation();

  if (loading)
    return <div className="text-center mt-3">{t("loadingPlayers")}</div>;
  if (error) return <div className="alert alert-danger">{error.message}</div>;

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

  const getAvailableGroups = () => {
    const availableGroups = [];
    if (malePlayers.length > 0) availableGroups.push("men");
    if (femalePlayers.length > 0) availableGroups.push("women");
    if (teamPlayers.length > 0) availableGroups.push("team");
    if (mixPlayers.length > 0) availableGroups.push("mix");
    return availableGroups;
  };

  const availableGroups = getAvailableGroups();

  const filteredPlayers = selectedGroup
    ? players.filter((player) => player.division.group_type === selectedGroup)
    : players;

  return (
    <div className="container mt-4">
      <h1 className="mb-4">{t("titlePlayersList")}</h1>
      <PlayerSelector
        groupTypes={availableGroups}
        selectedGroup={selectedGroup}
        onSelectGroup={setSelectedGroup} // Fonction de mise à jour du groupe sélectionné
      />
      <PlayerTable players={filteredPlayers} groupType={t(selectedGroup)} />
    </div>
  );
};

export default Players;
