import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useRefereeMatches from "../../Hooks/useRefereeMatches"; // Hook pour récupérer les matchs de l'arbitre
import MatchRow from "../../Components/MatchRow/MatchRow";

const RefereeDetails = () => {
  const { id, refereeId } = useParams();
  const { t } = useTranslation();
  const { referee, matches, loading, error } = useRefereeMatches(refereeId, id);

  if (loading)
    return <div className="text-center mt-3">{t("loadingRefereeDetails")}</div>;

  if (error) return <div className="alert alert-danger">{error?.message}</div>;

  if (!referee)
    return <div className="alert alert-warning">{t("refereeNotFound")}</div>;

  return (
    <div className="container mt-4">
      <h1 autoFocus>{t("refereeDetails")}</h1>
      <h2>
        {referee.firstname} {referee.lastname}
      </h2>

      <h3 className="mt-4">{t("matchesRefereed")}</h3>
      {matches.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th className="text-center">{t("day")}</th>
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
                  formatResult={(result) => result?.join(" - ") ?? ""}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>{t("noMatchesAvailable")}</div>
      )}
    </div>
  );
};

export default RefereeDetails;
