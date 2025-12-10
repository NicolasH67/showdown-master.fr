import React, { useEffect, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import useMatchesResult from "../../Hooks/useMatchResult";
import MatchRowResult from "../../Components/MatchRowResult/MatchRowResult";
import DateSelector from "../../Components/DateSelector/DateSelector";
import TableSelector from "../../Components/TableSelector/TableSelector";
import { useTranslation } from "react-i18next";
import {
  generate3SetSheetsBatch,
  generate1SetSheetsBatch,
  generate5SetSheetsBatch,
  generateTeamSetSheetsBatch,
} from "../../Helpers/generateMatchSheetPdf";

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
    refresh,
  } = useMatchesResult(id);

  const [selectedDate, setSelectedDate] = React.useState(null);
  const [selectedTable, setSelectedTable] = React.useState(null);

  // 🔹 matches “dirty” = ceux qui ont été modifiés (date, heure, table, arbitres, résultat…)
  const [dirtyMatchIds, setDirtyMatchIds] = React.useState(() => new Set());

  // 🔹 id du match vers lequel on doit scroller (dernier match avec un résultat)
  const [autoScrollTargetId, setAutoScrollTargetId] = React.useState(null);

  // Modal pour les feuilles de matchs
  const [isSheetModalOpen, setIsSheetModalOpen] = React.useState(false);
  const [sheetFromMnr, setSheetFromMnr] = React.useState("");
  const [sheetToMnr, setSheetToMnr] = React.useState("");
  const [sheetType, setSheetType] = React.useState("3_set");
  const [sheetError, setSheetError] = React.useState("");

  // Bulk save
  const [isBulkSaving, setIsBulkSaving] = React.useState(false);
  const rowSaveHandlersRef = React.useRef(new Map());

  // 👉 appelé par chaque MatchRowResult quand un match devient dirty / clean
  const handleDirtyChange = useCallback((matchId, isDirty) => {
    setDirtyMatchIds((prev) => {
      const next = new Set(prev);
      if (isDirty) {
        next.add(matchId);
      } else {
        next.delete(matchId);
      }
      return next;
    });
  }, []);

  const registerRowSaver = React.useCallback((matchId, saver) => {
    if (!matchId || typeof saver !== "function") return () => {};
    rowSaveHandlersRef.current.set(matchId, saver);
    return () => {
      rowSaveHandlersRef.current.delete(matchId);
    };
  }, []);

  const handleSaveAll = async () => {
    const savers = Array.from(rowSaveHandlersRef.current.entries())
      .filter(([matchId]) => dirtyMatchIds.has(matchId)) // 🔹 on ne sauvegarde que les matches dirty
      .map(([, saver]) => saver);

    if (!savers.length) return;

    setIsBulkSaving(true);
    try {
      for (const saveFn of savers) {
        try {
          await saveFn();
        } catch (e) {
          console.error("Error while saving one match", e);
        }
      }

      if (typeof refresh === "function") {
        try {
          await refresh();
        } catch (e) {
          console.error("Error while refreshing after bulk save", e);
        }
      }

      // Après un bulk save réussi on considère tout clean
      setDirtyMatchIds(new Set());
    } finally {
      setIsBulkSaving(false);
    }
  };

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

  useEffect(() => {
    const timer = setTimeout(() => {
      const title = document.getElementById("page-title");
      if (title && document.body.contains(title)) {
        title.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, matches?.length || 0]);

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

    // On a besoin de l’ordre global stable par MNR
    const safeTs = (m) => {
      const s = `${m?.match_day || ""}T${m?.match_time || ""}`;
      const ts = Date.parse(s);
      return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
    };
    const sortedForMnr = [...(matches || [])].sort((a, b) => {
      const ta = safeTs(a);
      const tb = safeTs(b);
      if (ta !== tb) return ta - tb;
      const taNum = Number(a?.table_number || 0);
      const tbNum = Number(b?.table_number || 0);
      if (taNum !== tbNum) return taNum - tbNum;
      return Number(a?.id || 0) - Number(b?.id || 0);
    });
    const mnrMap = new Map();
    sortedForMnr.forEach((m, idx) => mnrMap.set(m.id, idx + 1));

    const selected = sortedForMnr.filter((m) => {
      const n = mnrMap.get(m.id);
      return n && n >= from && n <= to;
    });

    if (!selected.length) {
      setSheetError("Aucun match pour cette plage de MNR.");
      return;
    }

    try {
      const items = selected.map((m) => ({
        match: m,
        mnr: mnrMap.get(m.id),
      }));

      if (sheetType === "1_set") {
        await generate1SetSheetsBatch(items);
      } else if (sheetType === "3_set") {
        await generate3SetSheetsBatch(items);
      } else if (sheetType === "5_set") {
        await generate5SetSheetsBatch(items);
      } else if (sheetType === "team") {
        await generateTeamSetSheetsBatch(items);
      }

      setIsSheetModalOpen(false);
    } catch (err) {
      console.error("Error generating sheets", err);
      alert(err?.message || String(err));
    }
  };

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

  // ordre MNR stable
  const [mnrOrderMap, setMnrOrderMap] = React.useState(null);

  useEffect(() => {
    if (!matches || matches.length === 0) return;

    setMnrOrderMap((prev) => {
      if (prev && prev.size === matches.length) {
        const allPresent = matches.every((m) => prev.has(m.id));
        if (allPresent) {
          return prev;
        }
      }

      const safeTs = (m) => {
        const s = `${m?.match_day || ""}T${m?.match_time || ""}`;
        const ts = Date.parse(s);
        return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
      };

      const copy = [...matches];
      copy.sort((a, b) => {
        const ta = safeTs(a);
        const tb = safeTs(b);
        if (ta !== tb) return ta - tb;
        const taNum = Number(a?.table_number || 0);
        const tbNum = Number(b?.table_number || 0);
        if (taNum !== tbNum) return taNum - tbNum;
        return Number(a?.id || 0) - Number(b?.id || 0);
      });

      const map = new Map();
      copy.forEach((m, idx) => {
        map.set(m.id, idx + 1);
      });
      return map;
    });
  }, [matches]);

  const globallySorted = React.useMemo(() => {
    if (!matches) return [];
    if (!mnrOrderMap) return [...matches];
    const copy = [...matches];
    copy.sort((a, b) => {
      const na = mnrOrderMap.get(a.id) || 0;
      const nb = mnrOrderMap.get(b.id) || 0;
      return na - nb;
    });
    return copy;
  }, [matches, mnrOrderMap]);

  const mnrMap = React.useMemo(() => {
    const map = new Map();
    (globallySorted || []).forEach((m, idx) => {
      map.set(m.id, idx + 1);
    });
    return map;
  }, [globallySorted]);

  const sortedMatches = React.useMemo(() => {
    const filtered = (matches || [])
      .filter((m) => !selectedDate || m.match_day === selectedDate)
      .filter((m) =>
        selectedTable === null || selectedTable === undefined
          ? true
          : Number(m.table_number) === Number(selectedTable)
      );

    if (!mnrOrderMap) {
      const safeTs = (m) => {
        const s = `${m?.match_day || ""}T${m?.match_time || ""}`;
        const ts = Date.parse(s);
        return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
      };
      return [...filtered].sort((a, b) => {
        const ta = safeTs(a);
        const tb = safeTs(b);
        if (ta !== tb) return ta - tb;
        const taNum = Number(a?.table_number || 0);
        const tbNum = Number(b?.table_number || 0);
        if (taNum !== tbNum) return taNum - tbNum;
        return Number(a?.id || 0) - Number(b?.id || 0);
      });
    }

    return [...filtered].sort((a, b) => {
      const na = mnrOrderMap.get(a.id) || 0;
      const nb = mnrOrderMap.get(b.id) || 0;
      return na - nb;
    });
  }, [matches, selectedDate, selectedTable, mnrOrderMap]);

  // 🔹 calcul de la ligne à scroller : dernier match avec un résultat non vide
  useEffect(() => {
    if (!sortedMatches || sortedMatches.length === 0) {
      setAutoScrollTargetId(null);
      return;
    }

    let targetId = null;
    for (let i = sortedMatches.length - 1; i >= 0; i--) {
      const m = sortedMatches[i];
      if (
        Array.isArray(m.result) &&
        m.result.some((v) => v !== null && v !== undefined)
      ) {
        targetId = m.id;
        break;
      }
    }
    setAutoScrollTargetId(targetId);
  }, [sortedMatches]);

  if (loading) {
    return <div>{t("loadingMatchs")}</div>;
  }

  if (error) {
    return <div>{error.message}</div>;
  }

  return (
    <div className="container">
      {/* header + bouton feuilles */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 id="page-title" tabIndex="-1" className="mb-0">
          {t("schedule")}
        </h1>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={handleOpenSheetModal}
          >
            {t("matchSheets", { defaultValue: "Feuilles de matchs" })}
          </button>
        </div>
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

      {/* modal feuilles de match */}
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

      {/* tableau + overlay de loading bulk */}
      <div className="position-relative">
        {isBulkSaving && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              zIndex: 10,
            }}
          >
            <div className="spinner-border" role="status">
              <span className="visually-hidden">
                {t("savingAllChanges", {
                  defaultValue: "Enregistrement en cours...",
                })}
              </span>
            </div>
          </div>
        )}
        <div
          className={
            isBulkSaving ? "table-responsive opacity-50" : "table-responsive"
          }
        >
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
                  onRefresh={refresh}
                  registerSaver={registerRowSaver}
                  isBulkSaving={isBulkSaving}
                  onDirtyChange={handleDirtyChange}
                  shouldScrollIntoView={autoScrollTargetId === match.id} // 🔹 pour le scroll auto
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* bouton flottant en bas à droite */}
      <div
        className="position-fixed"
        style={{
          right: "1.5rem",
          bottom: "1.5rem",
          zIndex: 1050,
        }}
      >
        <button
          type="button"
          className="btn btn-success btn-lg shadow"
          onClick={handleSaveAll}
          disabled={isBulkSaving || dirtyMatchIds.size === 0}
        >
          {isBulkSaving
            ? t("savingAllChanges", {
                defaultValue: "Enregistrement en cours...",
              })
            : t("saveAllChanges", {
                defaultValue: "Valider tous les changements",
              })}
        </button>
      </div>

      {/* espace en bas pour laisser respirer la page */}
      <div style={{ height: "120px" }}></div>
    </div>
  );
};

export default ResultEdit;
