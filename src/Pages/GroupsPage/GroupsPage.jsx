import { useParams } from "react-router-dom";
import { useState } from "react";
import useGroupsData from "../../Hooks/useGroupsData";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
import GroupTable from "../../Components/GroupTable/GroupTable";
import { useTranslation } from "react-i18next";

const GroupsPage = () => {
  const { id } = useParams();
  const { groups, players, loading, error } = useGroupsData(id);
  const [selectedRound, setSelectedRound] = useState("1st round");
  const { t } = useTranslation();

  if (loading)
    return <div className="text-center mt-3">{t("loadingGroups")}</div>;
  if (error) return <div className="alert alert-danger">{error.message}</div>;

  const filteredGroups = groups.filter(
    (group) => group.round_type === selectedRound
  );

  return (
    <div className="container mt-4">
      <h1 className="text-center">{t("tournamentGroups")}</h1>
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

const GroupsSection = ({ groups, players }) => {
  return (
    <section>
      {groups.map((group) => (
        <div key={group.id} className="mb-4">
          <h3 className="text-center">
            {group.name} - {group.group_type}
          </h3>
          <GroupTable
            players={players.filter(
              (player) => player.division.id === group.id
            )}
          />
        </div>
      ))}
    </section>
  );
};

export default GroupsPage;
