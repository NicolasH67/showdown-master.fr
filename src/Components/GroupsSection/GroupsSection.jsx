import GroupTable from "../GroupTable/GroupTable";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const GroupsSection = ({ groups, players, matches, allGroups }) => {
  const { t } = useTranslation();
  return (
    <section>
      {groups.map((group) => (
        <div key={group.id} className="mb-4">
          <h3 className="text-center">
            <Link to={`/tournament/${group.tournament_id}/groups/${group.id}`}>
              {group.name} - {t(group.group_type)}
            </Link>
          </h3>
          <GroupTable
            players={players.filter((player) => {
              const raw =
                player?.group_id ??
                player?.groupId ??
                (player?.group ? player.group.id : undefined);
              if (Array.isArray(raw)) {
                return raw.map((v) => Number(v)).includes(Number(group.id));
              }
              if (raw !== undefined && raw !== null) {
                return Number(raw) === Number(group.id);
              }
              return false;
            })}
            matches={matches.filter((match) => {
              const gid = match?.group?.id ?? match?.group_id ?? match?.groupId;
              return Number(gid) === Number(group.id);
            })}
            group={group}
            allGroups={allGroups}
          />
        </div>
      ))}
    </section>
  );
};

export default GroupsSection;
