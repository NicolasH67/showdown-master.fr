import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

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
  const { id } = useParams();
  const { t } = useTranslation();

  const sortPlayers = (players) => {
    return players.sort((a, b) =>
      a.lastname.toLowerCase().localeCompare(b.lastname.toLowerCase())
    );
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
                      <Link
                        to={`/tournament/${id}/players/${player.id}`}
                        style={{ textDecoration: "none" }}
                      >
                        {player.firstname} {player.lastname}
                      </Link>
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
