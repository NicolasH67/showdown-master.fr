import React, { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import useMatchesResult from "../../Hooks/useMatchResult";
import MatchRowResult from "../../Components/MatchRowResult/MatchRowResult";
import DateSelector from "../../Components/DateSelector/DateSelector";
import TableSelector from "../../Components/TableSelector/TableSelector";
import { useTranslation } from "react-i18next";

import supabase from "../../Helpers/supabaseClient";

const ResultEdit = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { id } = useParams();
  const {
    matches,
    groups,
    referees,
    loading,
    error,
    handleMatchChange,
    handleSave,
  } = useMatchesResult(id);

  const [allClubs, setAllClubs] = React.useState([]);
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [selectedTable, setSelectedTable] = React.useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const title = document.getElementById("page-title");
      if (title && document.body.contains(title)) {
        title.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, matches.length]);

  useEffect(() => {
    const fetchClubs = async () => {
      const { data: clubs, error: clubsError } = await supabase
        .from("club")
        .select("*");
      if (clubsError) {
        console.error("Erreur de chargement des clubs :", clubsError.message);
      } else {
        setAllClubs(clubs || []);
      }
    };
    fetchClubs();
  }, []);

  const uniqueDates = Array.from(
    new Set((matches || []).map((m) => m.match_day).filter(Boolean))
  ).sort();

  const tableCount = Math.max(
    0,
    ...(matches || []).map((m) => Number(m.table_number || 0))
  );

  // Build a stable global MNR ordering (by day, time, then table)
  const globallySorted = [...(matches || [])].sort((a, b) => {
    const dateA = new Date(`${a.match_day}T${a.match_time}`);
    const dateB = new Date(`${b.match_day}T${b.match_time}`);
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    const ta = Number(a.table_number || 0);
    const tb = Number(b.table_number || 0);
    if (ta !== tb) return ta - tb;
    // final tiebreaker to keep sort stable
    return Number(a.id) - Number(b.id);
  });

  const mnrMap = new Map();
  globallySorted.forEach((m, idx) => mnrMap.set(m.id, idx + 1));

  const filteredMatches = (matches || [])
    .filter((m) => !selectedDate || m.match_day === selectedDate)
    .filter((m) =>
      selectedTable === null || selectedTable === undefined
        ? true
        : Number(m.table_number) === Number(selectedTable)
    );

  const sortedMatches = [...filteredMatches].sort((a, b) => {
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
      <h1 id="page-title" tabIndex="-1">
        {t("schedule")}
      </h1>
      <DateSelector
        dates={uniqueDates}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <TableSelector
        tables={tableCount}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
      />
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
                allgroups={groups}
                allclubs={allClubs}
                match={match}
                index={index}
                mnr={mnrMap.get(match.id) || index + 1}
                referees={referees}
                onMatchChange={handleMatchChange}
                onSave={handleSave}
                tournamentId={id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultEdit;
