import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePlayerMatches from "../../Hooks/usePlayerMatches"; // Hook pour récupérer les matchs du joueur
import MatchTable from "../../Components/MatchTable/MatchTable"; // Table pour afficher les matchs
import PlayerStats from "../../Components/PlayerStats/PlayerStats";
import MatchRow from "../../Components/MatchRow/MatchRow";

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

export default PlayerDetails;
