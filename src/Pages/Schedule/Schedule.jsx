// Schedule.js
import React from "react";
import useMatches from "../../Hooks/useMatchs";
import MatchTable from "../../Components/MatchTable/MatchTable";
import { useTranslation } from "react-i18next";

const Schedule = () => {
  const { matches, loading, error } = useMatches();
  const { t } = useTranslation();

  if (loading) {
    return <div>{t("loadingMatchs")}</div>;
  }

  if (error) {
    return <div>{error.message}</div>;
  }

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">{t("schedule")}</h1>
      <MatchTable matches={matches} />
    </div>
  );
};

export default Schedule;
