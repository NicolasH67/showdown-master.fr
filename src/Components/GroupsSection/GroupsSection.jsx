import GroupTable from "../GroupTable/GroupTable";
import { useTranslation } from "react-i18next";

const GroupsSection = ({ groups, players, matches }) => {
  const { t } = useTranslation();
  return (
    <section>
      {groups.map((group) => (
        <div key={group.id} className="mb-4">
          <h3 className="text-center">
            {group.name} - {t(group.group_type)}
          </h3>
          <GroupTable
            players={players.filter((player) => player.group.id === group.id)}
            matches={matches.filter((match) => match.group.id === group.id)}
          />
        </div>
      ))}
    </section>
  );
};

export default GroupsSection;
