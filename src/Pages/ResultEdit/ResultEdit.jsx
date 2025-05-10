import React from "react";
import { useParams } from "react-router-dom";
import useMatchesResult from "../../Hooks/useMatchResult";
import MatchRowResult from "../../Components/MatchRowResult/MatchRowResult";
import { useTranslation } from "react-i18next";

const ResultEdit = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { matches, referees, loading, error, handleMatchChange, handleSave } =
    useMatchesResult(id);

  const sortedMatches = [...matches].sort((a, b) => {
    const dateA = new Date(`${a.match_day}T${a.match_time}`);
    const dateB = new Date(`${b.match_day}T${b.match_time}`);

    if (dateA < dateB) {
      return -1;
    } else if (dateA > dateB) {
      return 1;
    } else {
      return a.table_number - b.table_number;
    }
  });

  if (loading) {
    return <div>{t("loadingMatchs")}</div>;
  }

  if (error) {
    return <div>{error.message}</div>;
  }

  return (
    <div className="container">
      <h1>{t("schedule")}</h1>
      <div className="row g-3">
        {sortedMatches.map((match, index) => (
          <div key={match.id} className="col-12">
            <MatchRowResult
              match={match}
              index={index}
              referees={referees}
              onMatchChange={handleMatchChange}
              onSave={handleSave}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultEdit;
