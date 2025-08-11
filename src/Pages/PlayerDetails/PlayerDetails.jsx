import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePlayerMatches from "../../Hooks/usePlayerMatches"; // Hook pour récupérer les matchs du joueur
import PlayerStats from "../../Components/PlayerStats/PlayerStats";
import MatchRow from "../../Components/MatchRow/MatchRow";

const PlayerDetails = () => {
  const { id, playerId } = useParams();
  const { t } = useTranslation();

  // Assure-toi que les IDs passés au hook sont cohérents (string -> number si possible)
  const tournamentId = id ?? null;
  const selectedPlayerId = playerId ?? null;

  const { player, matches, loading, error } = usePlayerMatches(
    selectedPlayerId,
    tournamentId
  );

  const titleRef = useRef(null);

  useEffect(() => {
    if (!loading && titleRef.current) {
      titleRef.current.focus();
    }
  }, [loading]);

  if (loading) {
    return <div className="text-center mt-3">{t("loadingPlayerDetails")}</div>;
  }

  if (error) {
    const msg =
      typeof error === "string"
        ? error
        : error?.message || t("unexpectedError") || "Une erreur est survenue.";
    return <div className="alert alert-danger">{msg}</div>;
  }

  // Sécurise les données pour éviter tout crash si le hook renvoie null/undefined
  const safePlayer = player ?? null;
  const safeMatches = Array.isArray(matches) ? matches : [];

  if (process.env.NODE_ENV !== "production") {
    console.table(safeMatches);
    console.log("safeMatches:", JSON.stringify(safeMatches, null, 2));
  }

  // Petits utilitaires affichage
  const playerLabel =
    safePlayer?.firstname || safePlayer?.lastname
      ? `${safePlayer?.firstname ?? ""} ${safePlayer?.lastname ?? ""}`.trim()
      : t("unknownPlayer") || "Joueur";

  return (
    <div className="container mt-4">
      <h1 id="page-title" tabIndex="-1" ref={titleRef}>
        {t("playerDetails")}
      </h1>

      {/* Titre joueur – robuste même si player est null */}
      <h2 aria-live="polite">{playerLabel}</h2>

      {/* Stats joueur – si ton composant ne gère pas player null, passe-lui une valeur vide */}
      <PlayerStats player={safePlayer ?? {}} matches={safeMatches} />

      <h3 className="mt-4">{t("matches")}</h3>

      {safeMatches.length > 0 ? (
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
              {safeMatches.map((match, index) => (
                <MatchRow
                  key={match?.id ?? `${match?.group_id ?? "g"}-${index}`}
                  match={match}
                  index={index}
                  // Évite les crash côté rendu du résultat
                  formatResult={(result) =>
                    Array.isArray(result) ? result.join(" - ") : ""
                  }
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
