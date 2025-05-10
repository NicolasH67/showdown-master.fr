import React, { useState, useEffect } from "react";
import useMatches from "../../Hooks/useMatchs";
import MatchCard from "../../Components/MatchCard/MatchCard";
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

  useEffect(() => {
    console.log("Matches:", matches);
    console.log("Unique Dates:", uniqueDates);
    console.log("Selected Date:", selectedDate);
  }, [matches, uniqueDates, selectedDate]);

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
        filteredMatches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))
      ) : (
        <div>{t("noMatchesAvailable")}</div>
      )}
    </div>
  );
};

export default Schedule;
