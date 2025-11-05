import React from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GroupsSection from "../../Components/GroupsSection/GroupsSection";
import MatchRow from "../../Components/MatchRow/MatchRow";

import useGroupDetails from "../../Hooks/useGroupDetails";

const GroupsDetails = () => {
  const { t } = useTranslation();
  const { id, groupId } = useParams(); // /tournament/:id/groups/:groupId

  // 🔗 Utilisation du hook d'agrégation
  const { group, players, matches, allGroups, allClubs, loading, error } =
    useGroupDetails(id, groupId);

  // --- Render (présentation conservée) ---------------------------------
  if (loading) return <div className="p-4">{t("loading") || "Loading..."}</div>;
  if (error) return <div className="p-4 text-red-600">{String(error)}</div>;
  if (!group) return <div className="p-4">{t("notFound") || "Not found"}</div>;

  const formatResult = (result) => {
    if (!result || !Array.isArray(result) || result.length < 2) return "-";
    const sets = [];
    for (let i = 0; i < result.length; i += 2) {
      const playerAScore = result[i];
      const playerBScore = result[i + 1];
      if (playerBScore !== undefined) {
        sets.push(`${playerAScore}-${playerBScore}`);
      }
    }
    return sets.join(" ; ");
  };

  return (
    <div className="p-4 space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-3">
          {t("groupRanking") || "Classement du groupe"}
        </h2>
        <div className="overflow-x-auto">
          <GroupsSection
            groups={[group]}
            players={players}
            matches={matches}
            allGroups={allGroups}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">
          {t("groupMatches") || "Matchs du groupe"}
        </h2>
        <div className="overflow-x-auto">
          <table className="table table-striped table-bordered">
            <thead className="table-dark">
              <tr>
                <th className="text-center">{t("date")}</th>
                <th className="text-center">{t("time")}</th>
                <th className="text-center">{t("table")}</th>
                <th className="text-center">{t("group")}</th>
                <th className="text-center">{t("player1")}</th>
                <th className="text-center">{t("player2")}</th>
                <th className="text-center">{t("point")}</th>
                <th className="text-center">{t("set")}</th>
                <th className="text-center">{t("goal")}</th>
                <th className="text-center">{t("result")}</th>
                <th className="text-center">{t("referees")}</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, index) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  index={index}
                  formatResult={formatResult}
                  allgroups={allGroups}
                  allclubs={allClubs}
                  tournamentId={id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default GroupsDetails;
