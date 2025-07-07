import React, { useState, useEffect } from "react";
import useMatches from "../../Hooks/useMatchs";
import usePlayers from "../../Hooks/usePlayers";
import MatchRow from "../../Components/MatchRow/MatchRow";
import { useTranslation } from "react-i18next";
import DateSelector from "../../Components/DateSelector/DateSelector";

const Schedule = () => {
  const { matches, loading, error } = useMatches();
  const { t } = useTranslation();

  const getUniqueDates = (matches) => {
    const dates = matches.map((match) => match.match_day);
    return [...new Set(dates)].sort();
  };

  const uniqueDates = getUniqueDates(matches);
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    if (isFirstLoad && uniqueDates.includes(today)) {
      setSelectedDate(today);
      setIsFirstLoad(false);
    }
  }, [isFirstLoad, uniqueDates, today]);

  const formatResult = (result) => {
    if (!result || !Array.isArray(result) || result.length < 2) return "-";
    const sets = [];
    for (let i = 0; i < result.length; i += 2) {
      const playerAScore = result[i];
      const playerBScore = result[i + 1];
      if (playerBScore !== undefined) {
        sets.push(`${playerAScore}-${playerBScore}`);
      }
    }
    return sets.join(" ; ");
  };

  if (loading) {
    return <div>{t("loadingMatchs")}</div>;
  }

  if (error) {
    return <div>{error.message}</div>;
  }

  const filteredMatches = selectedDate
    ? matches.filter((match) => match.match_day === selectedDate)
    : matches;

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">{t("schedule")}</h1>

      <DateSelector
        dates={uniqueDates}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {filteredMatches.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead className="table-dark">
              <tr>
                <th className="text-center">{t("date")}</th>
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
              {filteredMatches.map((match, index) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  index={index}
                  formatResult={formatResult}
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

export default Schedule;
