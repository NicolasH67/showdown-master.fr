import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import useMatches from "../../Hooks/useMatchs";
import usePlayers from "../../Hooks/usePlayers";
import MatchRow from "../../Components/MatchRow/MatchRow";
import { useTranslation } from "react-i18next";
import DateSelector from "../../Components/DateSelector/DateSelector";
import supabase from "../../Helpers/supabaseClient";
import TableSelector from "../../Components/TableSelector/TableSelector";
import useGroupsData from "../../Hooks/useGroupsData";

const sortMatchesByDayTimeTable = (matches) => {
  return [...matches].sort((a, b) => {
    const dateA = a.match_day
      ? new Date(`${a.match_day}T${a.match_time || "00:00:00"}`)
      : new Date(0);
    const dateB = b.match_day
      ? new Date(`${b.match_day}T${b.match_time || "00:00:00"}`)
      : new Date(0);

    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;

    return (a.table_number || 0) - (b.table_number || 0);
  });
};

const Schedule = () => {
  const { id } = useParams();
  const tournamentIdNum = Number(id);
  const { matches, loading, error } = useMatches();
  const { groups, players, lowading, errorGroups } = useGroupsData();
  const { t } = useTranslation();
  const location = useLocation();
  const [allClubs, setAllClubs] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  const tournamentMatches = useMemo(() => {
    const all = Array.isArray(matches) ? matches : [];
    if (!Number.isFinite(tournamentIdNum)) return all;
    return all.filter((m) => Number(m.tournament_id) === tournamentIdNum);
  }, [matches, tournamentIdNum]);

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
    if (id) {
      fetchClubs();
    }
  }, [id]);

  const getUniqueDates = (matches) => {
    const dates = matches.map((match) => match.match_day);
    return [...new Set(dates)].sort();
  };

  const uniqueDates = getUniqueDates(tournamentMatches);
  const today = new Date().toISOString().split("T")[0];

  // Derive table count from current matches (max table_number)
  const tableCount = Math.max(
    0,
    ...tournamentMatches.map((m) => Number(m.table_number || 0))
  );

  const [selectedDate, setSelectedDate] = useState(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Flag pour ne scroller qu'une seule fois automatiquement
  const [hasAutoScrolledToLastResult, setHasAutoScrolledToLastResult] =
    useState(false);

  useEffect(() => {
    if (tournamentMatches.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, tournamentMatches.length]);

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

  const filteredMatches = tournamentMatches
    .filter((match) => !selectedDate || match.match_day === selectedDate)
    .filter((match) =>
      selectedTable === null || selectedTable === undefined
        ? true
        : Number(match.table_number) === Number(selectedTable)
    );

  const sortedMatches = sortMatchesByDayTimeTable(filteredMatches);

  // Index (dans sortedMatches) du dernier match ayant un résultat parmi les matches triés visibles
  const lastResultRowIndex = useMemo(() => {
    if (!sortedMatches || sortedMatches.length === 0) return null;

    for (let i = sortedMatches.length - 1; i >= 0; i--) {
      const m = sortedMatches[i];
      if (Array.isArray(m.result) && m.result.some((v) => v != null)) {
        return i;
      }
    }
    return null;
  }, [sortedMatches]);

  // Scroll automatique vers la ligne du dernier match avec résultat (une seule fois)
  useEffect(() => {
    console.log("[Schedule] auto-scroll effect", {
      lastResultRowIndex,
      hasAutoScrolledToLastResult,
      count: sortedMatches.length,
    });

    if (hasAutoScrolledToLastResult) return;
    if (lastResultRowIndex == null) return;

    const tbody = document.getElementById("schedule-tbody");
    const rowEl = tbody && tbody.children[lastResultRowIndex];
    console.log(
      "[Schedule] trying to scroll to index",
      lastResultRowIndex,
      !!rowEl
    );
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setHasAutoScrolledToLastResult(true);
    }
  }, [lastResultRowIndex, hasAutoScrolledToLastResult, sortedMatches]);

  if (loading) {
    return <div>{t("loadingMatchs")}</div>;
  }

  if (error) {
    return <div>{error.message}</div>;
  }

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

      {sortedMatches.length > 0 ? (
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
            <tbody id="schedule-tbody">
              {sortedMatches.map((match, index) => (
                <MatchRow
                  key={match.id}
                  rowId={`match-row-${match.id}`}
                  match={match}
                  index={index}
                  formatResult={formatResult}
                  allgroups={groups}
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
