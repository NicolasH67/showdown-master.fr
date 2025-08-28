import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import useMatches from "../../Hooks/useMatchs";
import usePlayers from "../../Hooks/usePlayers";
import MatchRow from "../../Components/MatchRow/MatchRow";
import { useTranslation } from "react-i18next";
import DateSelector from "../../Components/DateSelector/DateSelector";
import supabase from "../../Helpers/supabaseClient";
import TableSelector from "../../Components/TableSelector/TableSelector";

const Schedule = () => {
  const { id } = useParams();
  const { matches, loading, error } = useMatches();
  const { t } = useTranslation();
  const location = useLocation();
  const [allGroups, setAllgroups] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data: group, error: groupsError } = await supabase
        .from("group")
        .select("*")
        .eq("tournament_id", id);
      if (groupsError) {
        console.error(
          "Erreur de chargement des groupes :",
          groupsError.message
        );
      } else {
        setAllgroups(group);
      }
    };
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
    if (id) {
      fetchGroups();
      fetchClubs();
    }
  }, [id]);

  const getUniqueDates = (matches) => {
    const dates = matches.map((match) => match.match_day);
    return [...new Set(dates)].sort();
  };

  const uniqueDates = getUniqueDates(matches);
  const today = new Date().toISOString().split("T")[0];

  // Derive table count from current matches (max table_number)
  const tableCount = Math.max(
    0,
    ...matches.map((m) => Number(m.table_number || 0))
  );

  const [selectedDate, setSelectedDate] = useState(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    if (matches.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, matches.length]);

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

  const filteredMatches = matches
    .filter((match) => !selectedDate || match.match_day === selectedDate)
    .filter((match) =>
      selectedTable === null || selectedTable === undefined
        ? true
        : Number(match.table_number) === Number(selectedTable)
    );

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4" id="page-title" tabIndex="-1">
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
                  allgroups={allGroups}
                  allclubs={allClubs}
                  tournamentId={id}
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
