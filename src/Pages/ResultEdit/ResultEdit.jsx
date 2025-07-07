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
      <h1 autoFocus>{t("schedule")}</h1>
      <div className="table-responsive">
        <table className="table table-bordered table-hover text-center">
          <thead className="table-dark">
            <tr>
              <th className="text-center">MNR</th>
              <th className="text-center">{t("date")}</th>
              <th className="text-center">{t("time")}</th>
              <th className="text-center">{t("table")}</th>
              <th className="text-center">{t("group")}</th>
              <th className="text-center">{t("pairing")}</th>
              <th className="text-center">{t("point")}</th>
              <th className="text-center">{t("set")}</th>
              <th className="text-center">{t("goal")}</th>
              <th className="text-center">{t("result")}</th>
              <th className="text-center">{t("referees")}</th>
              <th className="text-center">{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedMatches.map((match, index) => (
              <MatchRowResult
                key={match.id}
                match={match}
                index={index}
                referees={referees}
                onMatchChange={handleMatchChange}
                onSave={handleSave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultEdit;
