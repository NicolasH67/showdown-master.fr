import React from "react";
import { useTranslation } from "react-i18next";

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
