import React from "react";
import MatchList from "../MatchList/MatchList";
import { useTranslation } from "react-i18next";

const GroupList = ({
  groups,
  players,
  clubs,
  matches,
  group_former,
  generateMatches,
  generatedMatches,
  updateGeneratedMatch,
  saveMatches,
  allGroups,
  onEditMatch,
  onDeleteMatch,
  tournamentStartDate,
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
                  {group.name} - {t(group.group_type)}
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
                    ) : group.group_former ? (
                      (() => {
                        try {
                          const parsedGroupFormer = Array.isArray(
                            group.group_former
                          )
                            ? group.group_former
                            : JSON.parse(group.group_former);
                          return parsedGroupFormer.map(
                            ([position, groupId], index) => {
                              const foundGroup = allGroups?.find(
                                (g) => g.id === Number(groupId)
                              );
                              return (
                                <tr key={`former-${index}`}>
                                  <td>{index + 1}</td>
                                  <td>
                                    {foundGroup
                                      ? `${foundGroup.name}(${position})`
                                      : `Groupe inconnu (${position})`}
                                  </td>
                                </tr>
                              );
                            }
                          );
                        } catch (error) {
                          console.error(t("groupFormerError"), error);
                          return (
                            <tr>
                              <td colSpan="2" className="text-center">
                                {t("groupFormerError")}
                              </td>
                            </tr>
                          );
                        }
                      })()
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center text-muted">
                          {t("messageNoPlayersInGroup")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {generatedMatches[group.id]?.length > 0 && (
                  <MatchList
                    matches={generatedMatches[group.id]}
                    players={players[group.id]}
                    groupId={group.id}
                    updateGeneratedMatch={updateGeneratedMatch}
                    saveMatches={saveMatches}
                    tournamentStartDate={tournamentStartDate}
                  />
                )}

                {matches[group.id] && matches[group.id].length > 0 && (
                  <div className="mt-4">
                    <h5>{t("existingMatches")}</h5>
                    <div className="table-responsive mt-3">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th className="text-center">{t("date")}</th>
                            <th className="text-center">{t("time")}</th>
                            <th className="text-center">{t("table")}</th>
                            <th className="text-center">{t("group")}</th>
                            <th className="text-center">{t("player1")}</th>
                            <th className="text-center">{t("player2")}</th>
                            <th className="text-center">{t("action")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches[group.id].map((match) => {
                            const player1 = players[group.id]?.find(
                              (p) => p.id === match.player1_id
                            );
                            const player2 = players[group.id]?.find(
                              (p) => p.id === match.player2_id
                            );
                            return (
                              <tr key={match.id}>
                                <td className="text-center">
                                  {match.match_day}
                                </td>
                                <td className="text-center">
                                  {new Date(
                                    `${match.match_day}T${match.match_time}`
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="text-center">
                                  {match.table_number}
                                </td>
                                <td className="text-center">{group.name}</td>
                                <td className="text-center">
                                  {player1
                                    ? `${player1.firstname} ${player1.lastname}`
                                    : group.group_former
                                    ? (() => {
                                        try {
                                          const parsed = JSON.parse(
                                            group.group_former
                                          );
                                          const entry =
                                            parsed[
                                              Number(
                                                match.player1_group_position
                                              ) - 1
                                            ];
                                          const refGroup = allGroups?.find(
                                            (g) => g.id === entry?.[1]
                                          );
                                          return refGroup
                                            ? `${refGroup.name}(${entry[0]})`
                                            : `Groupe ${entry?.[1]}(${entry?.[0]})`;
                                        } catch {
                                          return t("notAssigned");
                                        }
                                      })()
                                    : `ID ${match.player1_id}`}
                                </td>
                                <td className="text-center">
                                  {player2
                                    ? `${player2.firstname} ${player2.lastname}`
                                    : group.group_former
                                    ? (() => {
                                        try {
                                          const parsed = JSON.parse(
                                            group.group_former
                                          );
                                          const entry =
                                            parsed[
                                              Number(
                                                match.player2_group_position
                                              ) - 1
                                            ];
                                          const refGroup = allGroups?.find(
                                            (g) => g.id === entry?.[1]
                                          );
                                          return refGroup
                                            ? `${refGroup.name}(${entry[0]})`
                                            : `Groupe ${entry?.[1]}(${entry?.[0]})`;
                                        } catch {
                                          return t("notAssigned");
                                        }
                                      })()
                                    : `ID ${match.player2_id}`}
                                </td>
                                <td className="text-center">
                                  <button
                                    className="btn btn-sm btn-outline-primary me-2"
                                    onClick={() => onEditMatch(match)}
                                  >
                                    {t("edit")}
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => onDeleteMatch(match)}
                                  >
                                    {t("delete")}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary w-100"
                  onClick={() => generateMatches(group.id)}
                >
                  {t("matchesGenerate")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupList;
