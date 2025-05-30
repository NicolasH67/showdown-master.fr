import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useRefereeMatches from "../../Hooks/useRefereeMatches"; // Hook pour récupérer les matchs de l'arbitre
import MatchCard from "../../Components/MatchCard/MatchCard";

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
        matches.map((match) => <MatchCard key={match.id} match={match} />)
      ) : (
        <div>{t("noMatchesAvailable")}</div>
      )}
    </div>
  );
};

export default RefereeDetails;
