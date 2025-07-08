import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useClubMatches from "../../Hooks/useClubMatches"; // Hook pour récupérer les matchs du club
import MatchRow from "../../Components/MatchRow/MatchRow";
// import MatchCard from "../../Components/MatchCard/MatchCard";

const ProvenanceDetails = () => {
  const { id, provenanceId } = useParams();
  const { t } = useTranslation();
  const { club, matches, loading, error } = useClubMatches(provenanceId, id);

  if (loading)
    return (
      <div className="text-center mt-3">{t("loadingProvenanceDetails")}</div>
    );

  if (error) return <div className="alert alert-danger">{error?.message}</div>;

  if (!club)
    return <div className="alert alert-warning">{t("clubNotFound")}</div>;

  return (
    <div className="container mt-4">
      <h1 autoFocus>{t("provenanceDetails")}</h1>
      <h2>{club.name}</h2>

      <h3 className="mt-4">{t("matches")}</h3>
      {matches.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead className="table-dark">
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

export default ProvenanceDetails;
