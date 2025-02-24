import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useRefereeMatches from "../../Hooks/useRefereeMatches"; // Hook pour récupérer les matchs de l'arbitre
import MatchTable from "../../Components/MatchTable/MatchTable"; // Table pour afficher les matchs

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
      <h1>{t("refereeDetails")}</h1>
      <h2>
        {referee.firstname} {referee.lastname}
      </h2>

      <h3 className="mt-4">{t("matchesRefereed")}</h3>
      {matches?.length > 0 ? (
        <MatchTable matches={matches} />
      ) : (
        <p>{t("noMatches")}</p>
      )}
    </div>
  );
};

export default RefereeDetails;
