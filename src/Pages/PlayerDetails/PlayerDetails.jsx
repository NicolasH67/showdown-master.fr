import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePlayerMatches from "../../Hooks/usePlayerMatches"; // Hook pour récupérer les matchs du joueur
import MatchTable from "../../Components/MatchTable/MatchTable"; // Table pour afficher les matchs
import PlayerStats from "../../Components/PlayerStats/PlayerStats";
import MatchCard from "../../Components/MatchCard/MatchCard";

const PlayerDetails = () => {
  const { id, playerId } = useParams();
  const { t } = useTranslation();
  const { player, matches, loading, error } = usePlayerMatches(playerId, id);

  if (loading)
    return <div className="text-center mt-3">{t("loadingPlayerDetails")}</div>;
  if (error) return <div className="alert alert-danger">{error.message}</div>;

  return (
    <div className="container mt-4">
      <h1>{t("playerDetails")}</h1>
      <h2>
        {player.firstname} {player.lastname}
      </h2>

      <PlayerStats />

      <h3>{t("matches")}</h3>
      {matches.length > 0 ? (
        matches.map((match) => <MatchCard key={match.id} match={match} />)
      ) : (
        <div>{t("noMatchesAvailable")}</div>
      )}
    </div>
  );
};

export default PlayerDetails;
