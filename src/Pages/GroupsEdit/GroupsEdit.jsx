import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import GroupForm from "../../Components/GroupForm/GroupForm";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
import GroupsSection from "../../Components/GroupsSection/GroupsSection";
import useGroupsData from "../../Hooks/useGroupsData";
import { useTranslation } from "react-i18next";

const GroupsEdit = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [selectedRound, setSelectedRound] = useState(
    localStorage.getItem("lastRound") || "1st round"
  );

  const { groups, players, setGroups } = useGroupsData(id);

  const filteredGroups = groups.filter(
    (group) => group.round_type === selectedRound
  );

  return (
    <div className="container mt-4">
      <h1>{t("createNewGroup")}</h1>
      <GroupForm tournamentId={id} setGroups={setGroups} />
      <RoundSelector
        selectedRound={selectedRound}
        setSelectedRound={setSelectedRound}
      />
      {filteredGroups.length > 0 ? (
        <GroupsSection groups={filteredGroups} players={players} />
      ) : (
        <div className="alert alert-warning text-center">
          Aucun groupe trouvé pour ce tour.
        </div>
      )}
    </div>
  );
};

export default GroupsEdit;
