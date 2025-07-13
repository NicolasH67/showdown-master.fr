import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import usePlayers from "../../Hooks/usePlayers";
import PlayerTable from "../../Components/PlayerTable/PlayerTable";
import { useTranslation } from "react-i18next";
import PlayerSelector from "../../Components/PlayerSelector/PlayerSelector";
import useReferees from "../../Hooks/useReferee";
import RefereeTable from "../../Components/RefereeTable/RefereeTable";

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
  const {
    players,
    loading: playersLoading,
    error: playersError,
  } = usePlayers(id);
  const {
    referees,
    loading: refereesLoading,
    error: refereesError,
  } = useReferees(id);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (players.length > 0 && referees.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, players.length, referees.length]);

  if (playersLoading || refereesLoading)
    return <div className="text-center mt-3">{t("loadingPlayers")}</div>;
  if (playersError || refereesError)
    return (
      <div className="alert alert-danger">
        {players.message} {refereesError.message}
      </div>
    );

  const malePlayers = players.filter(
    (player) => player.group.group_type === "men"
  );
  const femalePlayers = players.filter(
    (player) => player.group.group_type === "women"
  );
  const teamPlayers = players.filter(
    (player) => player.group.group_type === "team"
  );
  const mixPlayers = players.filter(
    (player) => player.group.group_type === "mix"
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
    ? players.filter((player) => player.group.group_type === selectedGroup)
    : players;

  return (
    <div className="container mt-4">
      <h1 className="mb-4" id="page-title" tabIndex="-1">
        {t("titlePlayersList")}
      </h1>
      <PlayerSelector
        groupTypes={availableGroups}
        selectedGroup={selectedGroup}
        onSelectGroup={setSelectedGroup}
      />
      <PlayerTable players={filteredPlayers} groupType={t(selectedGroup)} />
      <RefereeTable referees={referees} />
    </div>
  );
};

export default Players;
