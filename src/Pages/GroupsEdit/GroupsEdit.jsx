import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import GroupForm from "../../Components/GroupForm/GroupForm";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
import GroupTableEdit from "../../Components/GroupTableEdit/GroupTableEdit"; // Nouveau composant
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

  const handleDeleteGroup = (groupId) => {
    setGroups((prevGroups) =>
      prevGroups.filter((group) => group.id !== groupId)
    );
  };

  return (
    <div className="container mt-4">
      <h1 autoFocus>{t("createNewGroup")}</h1>
      <GroupForm tournamentId={id} setGroups={setGroups} />
      <RoundSelector
        selectedRound={selectedRound}
        setSelectedRound={setSelectedRound}
      />
      {filteredGroups.length > 0 ? (
        <GroupTableEdit
          groups={filteredGroups}
          players={players}
          onEdit={(updatedGroup) => {
            setGroups((prevGroups) =>
              prevGroups.map((group) =>
                group.id === updatedGroup.id ? updatedGroup : group
              )
            );
          }}
          onDelete={handleDeleteGroup}
          allGroups={groups}
        />
      ) : (
        <div className="alert alert-warning text-center">
          {t("noGroupsFound")}
        </div>
      )}
    </div>
  );
};

export default GroupsEdit;
