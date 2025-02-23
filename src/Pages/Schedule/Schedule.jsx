import React from "react";
import useMatches from "../../Hooks/useMatchs";
import MatchTable from "../../Components/MatchTable/MatchTable";
import { useTranslation } from "react-i18next";
import DateSelector from "../../Components/DateSelector/DateSelector";
import { useState } from "react";

/**
 * `Schedule` Component
 * @component
 * @returns {JSX.Element} A page displaying the match schedule.
 */
const Schedule = () => {
  const { matches, loading, error } = useMatches();
  const [selectedDate, setSelectedDate] = useState(null);
  const { t } = useTranslation();

  const getUniqueDates = (matches) => {
    const dates = matches.map((match) => match.match_date);
    return [...new Set(dates)].sort();
  };

  if (loading) {
    return <div>{t("loadingMatchs")}</div>;
  }

  if (error) {
    return <div>{error.message}</div>;
  }

  const uniqueDates = getUniqueDates(matches);

  const filteredMatches = selectedDate
    ? matches.filter((match) => match.match_date === selectedDate)
    : matches;

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">{t("schedule")}</h1>
      <DateSelector
        dates={uniqueDates}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <MatchTable matches={filteredMatches} />
    </div>
  );
};

export default Schedule;
