import React from "react";
import { useTranslation } from "react-i18next";

const GroupTable = ({ players }) => {
  const { t, i18n } = useTranslation();
  return (
    <table className="table table-bordered">
      <thead>
        <tr>
          <th>{t("ranking")}</th>
          <th>{t("name")}</th>
          <th>{t("point")}</th>
          <th>{t("set")}</th>
          <th>{t("goal")}</th>
        </tr>
      </thead>
      <tbody>
        {players.length > 0 ? (
          players.map((player, index) => (
            <tr key={player.id}>
              <td>{index + 1}</td>
              <td>
                {player.firstname} {player.lastname}
              </td>
              <td>0 (0:0)</td>
              <td>0 (0:0)</td>
              <td>0 (0:0)</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="5" className="text-center">
              {t("messageNoPlayersInGroup")}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default GroupTable;
