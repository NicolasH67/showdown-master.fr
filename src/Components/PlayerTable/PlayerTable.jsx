import React from "react";
import { useTranslation } from "react-i18next";

/**
 * A component that renders a table of players sorted by last name, with their group type.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {Array} props.players - A list of player objects to be displayed in the table.
 * @param {string} props.groupType - The name of the group (division) that the players belong to.
 *
 * @returns {JSX.Element} A JSX element representing a table of players with their group type.
 */
const PlayerTable = ({ players, groupType }) => {
  const { t, i18n } = useTranslation();
  const sortPlayers = (players) => {
    return players.sort((a, b) => {
      const lastNameA = a.lastname.toLowerCase();
      const lastNameB = b.lastname.toLowerCase();
      return lastNameA.localeCompare(lastNameB);
    });
  };

  return (
    <>
      {players.length > 0 && (
        <>
          <h2>{groupType}</h2>
          <div className="container mt-4">
            <table className="table table-bordered table-hover">
              <thead>
                <tr>
                  <th>{t("namePlayerTable")}</th>
                  <th>{t("groups")}</th>
                </tr>
              </thead>
              <tbody>
                {sortPlayers(players).map((player) => (
                  <tr key={player.id} style={{ cursor: "pointer" }}>
                    <td>
                      {player.firstname} {player.lastname}
                    </td>
                    <td>{player.division.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default PlayerTable;
