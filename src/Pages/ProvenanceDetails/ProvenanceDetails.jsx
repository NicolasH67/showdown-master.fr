import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useClubMatches from "../../Hooks/useClubMatches"; // Hook pour récupérer les matchs du club
import MatchCard from "../../Components/MatchCard/MatchCard";

const ProvenanceDetails = () => {
  const { id, provenanceId } = useParams();
  const { t } = useTranslation();
  const { club, matches, loading, error } = useClubMatches(provenanceId, id);

  if (loading)
    return <div className="text-center mt-3">{t("loadingClubDetails")}</div>;

  if (error) return <div className="alert alert-danger">{error?.message}</div>;

  if (!club)
    return <div className="alert alert-warning">{t("clubNotFound")}</div>;

  return (
    <div className="container mt-4">
      <h1>{t("provenanceDetails")}</h1>
      <h2>{club.name}</h2>

      <h3 className="mt-4">{t("matches")}</h3>
      {matches.length > 0 ? (
        matches.map((match) => <MatchCard key={match.id} match={match} />)
      ) : (
        <div>{t("noMatchesAvailable")}</div>
      )}
    </div>
  );
};

export default ProvenanceDetails;
