import GroupTable from "../GroupTable/GroupTable";

const GroupsSection = ({ groups, players }) => {
  return (
    <section>
      {groups.map((group) => (
        <div key={group.id} className="mb-4">
          <h3 className="text-center">
            {group.name} - {group.group_type}
          </h3>
          <GroupTable
            players={players.filter((player) => player.group.id === group.id)}
          />
        </div>
      ))}
    </section>
  );
};

export default GroupsSection;
