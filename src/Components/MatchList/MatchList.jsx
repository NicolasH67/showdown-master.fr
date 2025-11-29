import React from "react";
import { useTranslation } from "react-i18next";

const MatchList = ({
  matches,
  players,
  groupId,
  updateGeneratedMatch,
  saveMatches,
  tournamentStartDate, // ajout de la prop
}) => {
  const { t } = useTranslation();
  return (
    <div className="mt-3">
      <h4 className="text-primary">{t("matchesGenerated")}</h4>

      <div className="table-responsive">
        <table className="table table-striped table-hover table-bordered">
          <thead className="table-dark">
            <tr>
              <th>{t("player1")}</th>
              <th>{t("player2")}</th>
              <th>{t("date")}</th>
              <th>{t("time")}</th>
              <th>{t("table")}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match, index) => (
              <tr key={index}>
                <td>
                  {Array.isArray(players) &&
                  players.find((p) => p.id === match.player1_id)
                    ? `${
                        players.find((p) => p.id === match.player1_id).firstname
                      } ${
                        players.find((p) => p.id === match.player1_id).lastname
                      }`
                    : match.player1_group_position || "—"}
                </td>
                <td>
                  {Array.isArray(players) &&
                  players.find((p) => p.id === match.player2_id)
                    ? `${
                        players.find((p) => p.id === match.player2_id).firstname
                      } ${
                        players.find((p) => p.id === match.player2_id).lastname
                      }`
                    : match.player2_group_position || "—"}
                </td>
                <td>
                  <input
                    type="date"
                    className="form-control"
                    value={match.match_date || tournamentStartDate || ""}
                    onChange={(e) =>
                      updateGeneratedMatch(
                        groupId,
                        index,
                        "match_date",
                        e.target.value
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="time"
                    className="form-control"
                    value={match.match_time || ""}
                    onChange={(e) =>
                      updateGeneratedMatch(
                        groupId,
                        index,
                        "match_time",
                        e.target.value
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    placeholder={t("table")}
                    value={match.table_number ?? ""}
                    onChange={(e) =>
                      updateGeneratedMatch(
                        groupId,
                        index,
                        "table_number",
                        e.target.value
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="btn btn-success w-100 mt-2"
        onClick={() => saveMatches(groupId)}
      >
        {t("saveChanges")}
      </button>
    </div>
  );
};

export default MatchList;
