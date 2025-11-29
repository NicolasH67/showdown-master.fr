import React, { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import useMatchesResult from "../../Hooks/useMatchResult";
import MatchRowResult from "../../Components/MatchRowResult/MatchRowResult";
import DateSelector from "../../Components/DateSelector/DateSelector";
import TableSelector from "../../Components/TableSelector/TableSelector";
import { useTranslation } from "react-i18next";
import { generate3SetSheetsBatch } from "../../Helpers/generateMatchSheetPdf";

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

  // État pour le modal de génération de feuilles de matchs (plage de MNR)
  const [isSheetModalOpen, setIsSheetModalOpen] = React.useState(false);
  const [sheetFromMnr, setSheetFromMnr] = React.useState("");
  const [sheetToMnr, setSheetToMnr] = React.useState("");
  const [sheetType, setSheetType] = React.useState("3_set");
  const [sheetError, setSheetError] = React.useState("");

  const handleOpenSheetModal = () => {
    setSheetError("");
    setSheetFromMnr("");
    setSheetToMnr("");
    setSheetType("3_set");
    setIsSheetModalOpen(true);
  };

  const handleCloseSheetModal = () => {
    setIsSheetModalOpen(false);
  };

  const handleGenerateSheetsRange = async (e) => {
    e.preventDefault();
    setSheetError("");

    const from = Number(sheetFromMnr);
    const to = sheetToMnr === "" ? from : Number(sheetToMnr);

    if (!Number.isFinite(from) || from <= 0) {
      setSheetError("MNR de début invalide.");
      return;
    }
    if (!Number.isFinite(to) || to < from) {
      setSheetError("MNR de fin invalide.");
      return;
    }

    // Filtrer les matchs dans la plage de MNR selon l'ordre global
    const selected = globallySorted.filter((m) => {
      const n = mnrMap.get(m.id);
      return n && n >= from && n <= to;
    });

    if (!selected.length) {
      setSheetError("Aucun match pour cette plage de MNR.");
      return;
    }

    if (sheetType !== "3_set") {
      // Pour l'instant seule la feuille 3 sets est implémentée
      alert("Pour le moment, seule la feuille 3 sets est disponible.");
      return;
    }

    try {
      // Prépare une liste { match, mnr } pour la génération batch
      const items = selected.map((m) => ({
        match: m,
        mnr: mnrMap.get(m.id),
      }));

      // Génère un seul PDF multi-pages (une page par match)
      await generate3SetSheetsBatch(items);

      setIsSheetModalOpen(false);
    } catch (err) {
      console.error("Error generating sheets", err);
      alert(err?.message || String(err));
    }
  };

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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 id="page-title" tabIndex="-1" className="mb-0">
          {t("schedule")}
        </h1>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={handleOpenSheetModal}
        >
          {t("matchSheets", { defaultValue: "Feuilles de matchs" })}
        </button>
      </div>

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
      {isSheetModalOpen && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {t("matchSheets", { defaultValue: "Feuilles de matchs" })}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label={t("close", { defaultValue: "Fermer" })}
                  onClick={handleCloseSheetModal}
                ></button>
              </div>
              <form onSubmit={handleGenerateSheetsRange}>
                <div className="modal-body">
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">
                        {t("fromMnr", { defaultValue: "De MNR" })}
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={sheetFromMnr}
                        onChange={(e) => setSheetFromMnr(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">
                        {t("toMnr", { defaultValue: "À MNR" })}
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={sheetToMnr}
                        onChange={(e) => setSheetToMnr(e.target.value)}
                        placeholder={sheetFromMnr || ""}
                      />
                      <div className="form-text">
                        {t("toMnrHelp", {
                          defaultValue:
                            "Laissez vide pour ne générer qu'une seule feuille.",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="form-label">
                      {t("matchType", { defaultValue: "Type de match" })}
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={sheetType}
                      onChange={(e) => setSheetType(e.target.value)}
                    >
                      <option value="1_set">1 set</option>
                      <option value="3_set">3 sets</option>
                      <option value="5_set">5 sets</option>
                      <option value="team">Team</option>
                    </select>
                    <p className="small text-muted mt-2">
                      {t("sheetsInfoHelp", {
                        defaultValue:
                          "Une feuille par match sera générée selon la plage de MNR.",
                      })}
                    </p>
                  </div>

                  {sheetError && (
                    <div className="alert alert-danger mt-2" role="alert">
                      {sheetError}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseSheetModal}
                  >
                    {t("cancel", { defaultValue: "Annuler" })}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t("download", { defaultValue: "Générer" })}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
