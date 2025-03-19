import React from "react";
import MatchList from "../MatchList/MatchList";
import { useTranslation } from "react-i18next";

const GroupList = ({
  groups,
  players,
  clubs,
  generateMatches,
  generatedMatches,
  updateGeneratedMatch,
  saveMatches,
}) => {
  const { t } = useTranslation();
  return (
    <div className="container mt-4">
      <div className="row">
        {groups.map((group) => (
          <div key={group.id} className="mb-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title text-primary text-center">
                  {group.name} - {group.group_type}
                </h5>

                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("ranking")}</th>
                      <th>{t("namePlayerTable")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players[group.id]?.length ? (
                      players[group.id].map((player, index) => (
                        <tr key={player.id}>
                          <td>{index + 1}</td>
                          <td>
                            {player.firstname} {player.lastname} (
                            {clubs[player.club_id] || "N/A"})
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center text-muted">
                          {t("messageNoPlayersInGroup")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <button
                  className="btn btn-primary w-100"
                  onClick={() => generateMatches(group.id)}
                >
                  {t("matchesGenerate")}
                </button>

                {generatedMatches[group.id]?.length > 0 && (
                  <MatchList
                    matches={generatedMatches[group.id]}
                    players={players[group.id]}
                    groupId={group.id}
                    updateGeneratedMatch={updateGeneratedMatch}
                    saveMatches={saveMatches}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupList;
