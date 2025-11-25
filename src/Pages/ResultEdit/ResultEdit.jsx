import React, { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import useMatchesResult from "../../Hooks/useMatchResult";
import MatchRowResult from "../../Components/MatchRowResult/MatchRowResult";
import DateSelector from "../../Components/DateSelector/DateSelector";
import TableSelector from "../../Components/TableSelector/TableSelector";
import { useTranslation } from "react-i18next";

const ResultEdit = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { id } = useParams();
  const tournamentIdNum = Number(id);
  const {
    matches,
    groups,
    referees,
    clubs,
    loading,
    error,
    handleMatchChange,
    handleSave,
    refresh, // 👈 fonction de rafraîchissement exposée par le hook
  } = useMatchesResult(id);

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

  const uniqueDates = React.useMemo(() => {
    const set = new Set(
      (matches || [])
        .map((m) => m?.match_day)
        .filter((d) => typeof d === "string" && d.length > 0)
    );
    return Array.from(set).sort();
  }, [matches]);

  const tableCount = React.useMemo(() => {
    const nums = (matches || []).map((m) => Number(m?.table_number || 0));
    if (nums.length === 0) return 0;
    return Math.max(0, ...nums);
  }, [matches]);

  // Build a stable global MNR ordering (by day, time, then table)
  const globallySorted = React.useMemo(() => {
    const safeTs = (m) => {
      const s = `${m?.match_day || ""}T${m?.match_time || ""}`;
      const ts = Date.parse(s);
      return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
    };
    const copy = [...(matches || [])];
    copy.sort((a, b) => {
      const ta = safeTs(a);
      const tb = safeTs(b);
      if (ta !== tb) return ta - tb;
      const taNum = Number(a?.table_number || 0);
      const tbNum = Number(b?.table_number || 0);
      if (taNum !== tbNum) return taNum - tbNum;
      return Number(a?.id || 0) - Number(b?.id || 0);
    });
    return copy;
  }, [matches]);

  const mnrMap = new Map();
  globallySorted.forEach((m, idx) => mnrMap.set(m.id, idx + 1));

  const sortedMatches = React.useMemo(() => {
    const safeTs = (m) => {
      const s = `${m?.match_day || ""}T${m?.match_time || ""}`;
      const ts = Date.parse(s);
      return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
    };
    const filtered = (matches || [])
      .filter((m) => !selectedDate || m.match_day === selectedDate)
      .filter((m) =>
        selectedTable === null || selectedTable === undefined
          ? true
          : Number(m.table_number) === Number(selectedTable)
      );
    return [...filtered].sort((a, b) => {
      const ta = safeTs(a);
      const tb = safeTs(b);
      if (ta !== tb) return ta - tb;
      const taNum = Number(a?.table_number || 0);
      const tbNum = Number(b?.table_number || 0);
      if (taNum !== tbNum) return taNum - tbNum;
      return Number(a?.id || 0) - Number(b?.id || 0);
    });
  }, [matches, selectedDate, selectedTable]);

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
                allclubs={clubs}
                match={match}
                index={index}
                mnr={mnrMap.get(match.id) || index + 1}
                referees={referees}
                onMatchChange={handleMatchChange}
                onSave={handleSave}
                tournamentId={tournamentIdNum}
                onRefresh={refresh} // 👈 déclenche un refetch des données après un save
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultEdit;
