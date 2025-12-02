import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useMatchRowApi from "../../Hooks/useMatchRowApi";

const MatchRowResult = ({
  match,
  allgroups,
  index,
  mnr,
  referees = [],
  onMatchChange,
  onSave,
  allclubs,
  tournamentId,
  onRefresh,
  registerSaver,
  isBulkSaving = false,
  onDirtyChange, // 👈 nouveau: le parent peut être notifié qu'une ligne est “dirty”
}) => {
  const { t } = useTranslation();
  const { saveMatch, postProcessAfterSave } = useMatchRowApi(
    tournamentId,
    allgroups
  );

  const getClubAbbr = (clubId) => {
    if (!clubId || !Array.isArray(allclubs)) return "";
    const club = allclubs.find((c) => String(c.id) === String(clubId));
    if (!club) return "";
    const abbr =
      club.abbr ||
      club.abbreviation ||
      club.acronym ||
      club.short_name ||
      club.shortname ||
      club.short ||
      club.code ||
      club.slug ||
      (typeof club.name === "string" ? club.name.split(" ")[0] : "");
    return abbr ? String(abbr).trim().toUpperCase() : "";
  };

  const [localResults, setLocalResults] = useState(
    match.result?.map((v) => (v === null ? "" : v.toString())) ||
      Array(10).fill("")
  );
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Local edit buffers
  const [editDay, setEditDay] = useState(match.match_day || "");
  const [editTime, setEditTime] = useState("");
  const [editTable, setEditTable] = useState(match.table_number ?? "");

  // Local referee selection + "dirty" flags
  const [localReferee1Id, setLocalReferee1Id] = useState(
    match.referee1_id !== undefined
      ? match.referee1_id
      : match.referee_1
      ? match.referee_1.id
      : ""
  );
  const [localReferee2Id, setLocalReferee2Id] = useState(
    match.referee2_id !== undefined
      ? match.referee2_id
      : match.referee_2
      ? match.referee_2.id
      : ""
  );
  const [ref1Dirty, setRef1Dirty] = useState(false);
  const [ref2Dirty, setRef2Dirty] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  // 👉 état pour savoir si cette ligne a été modifiée (peu importe le champ)
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // helper pour marquer la ligne comme “dirty” une seule fois
  const markDirty = () => {
    if (!hasLocalChanges) {
      setHasLocalChanges(true);
      if (typeof onDirtyChange === "function") {
        onDirtyChange(match.id, true);
      }
    }
  };

  // Accepts 1 to 5 sets written as pairs: a-b-a-b-... (no trailing hyphen)
  const RESULT_REGEX = /^\d{1,2}-\d{1,2}(?:-\d{1,2}-\d{1,2}){0,4}$/;

  const isValidResultText = (text) => {
    const trimmed = (text || "").trim();
    if (!RESULT_REGEX.test(trimmed)) return false;
    const parts = trimmed.split("-");
    return parts.length >= 2 && parts.length <= 10 && parts.length % 2 === 0;
  };

  useEffect(() => {
    setLocalResults(
      match.result?.map((v) => (v === null ? "" : v.toString())) ||
        Array(10).fill("")
    );
    setResultText(
      match.result?.filter((v) => v !== null && v !== undefined).join("-") || ""
    );
  }, [match.result]);

  useEffect(() => {
    // Initialisation quand on change de match ou que ses champs sont mis à jour depuis l'API
    setEditDay(match.match_day || "");
    setEditTime(match.match_time ? toHHMM(match.match_time) : "");
    setEditTable(match.table_number ?? "");

    const r1 =
      match.referee1_id !== undefined
        ? match.referee1_id
        : match.referee_1
        ? match.referee_1.id
        : "";
    const r2 =
      match.referee2_id !== undefined
        ? match.referee2_id
        : match.referee_2
        ? match.referee_2.id
        : "";

    setLocalReferee1Id(r1);
    setLocalReferee2Id(r2);
    setRef1Dirty(false);
    setRef2Dirty(false);

    // Les données venant du backend sont “propres”
    setHasLocalChanges(false);
  }, [
    match.id,
    match.match_day,
    match.match_time,
    match.table_number,
    match.referee1_id,
    match.referee2_id,
    match.referee_1,
    match.referee_2,
  ]);

  // Enregistrer un "saver" pour le bulk save
  useEffect(() => {
    if (!registerSaver) return;

    const saver = async () => {
      await handleSave();
      setIsEditing(false);
    };

    const unregister = registerSaver(match.id, saver);
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    registerSaver,
    match.id,
    resultText,
    editDay,
    editTime,
    editTable,
    localReferee1Id,
    localReferee2Id,
    ref1Dirty,
    ref2Dirty,
    isBulkSaving,
  ]);

  const calculateStats = (result) => {
    let sets = [0, 0];
    let goals = [0, 0];

    for (let i = 0; i < result.length; i += 2) {
      const a = result[i];
      const b = result[i + 1];
      if (a == null || b == null) continue;
      if (a > b) sets[0]++;
      else sets[1]++;
      goals[0] += a;
      goals[1] += b;
    }

    let points = [0, 0];
    if (sets[0] > sets[1]) points = [1, 0];
    else if (sets[1] > sets[0]) points = [0, 1];

    return { points, sets, goals };
  };

  const formatTime = (t) => {
    if (!t) return "";
    if (typeof t === "string") {
      const parts = t.split(":");
      if (parts.length >= 2) {
        const hh = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        return `${hh}:${mm}`;
      }
    }
    try {
      const d = new Date(t);
      if (!isNaN(d)) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }
    } catch (_) {}
    return String(t);
  };

  const toHHMM = (t) => {
    if (!t) return "";
    if (typeof t === "string") {
      const parts = t.split(":");
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
      }
    }
    try {
      const d = new Date(t);
      if (!isNaN(d)) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`;
      }
    } catch (_) {}
    return "";
  };

  const toHHMMSS = (t) => {
    if (!t) return null;
    if (typeof t === "string") {
      const parts = t.split(":");
      if (parts.length === 2) {
        const hh = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        return `${hh}:${mm}:00`;
      }
      if (parts.length >= 3) {
        const hh = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        const ss = parts[2].padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
      }
    }
    try {
      const d = new Date(t);
      if (!isNaN(d)) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}:00`;
      }
    } catch (_) {}
    return null;
  };

  const parsedResults = localResults.map((v) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  });
  const { points, sets, goals } = calculateStats(parsedResults);

  const handleSave = async () => {
    const inputText = (resultText || "").trim();

    let cleanedResults = [];
    if (inputText === "") {
      cleanedResults = [];
    } else {
      if (!isValidResultText(inputText)) {
        setErrorMsg(
          t("invalidResultFormat") ||
            "Format invalide. Utilisez des paires a-b séparées par des tirets (ex: 11-1 ou 11-1-11-1), maximum 5 sets."
        );
        setIsEditing(true);
        return;
      }

      cleanedResults = inputText
        .split("-")
        .map((v) => parseInt(v, 10))
        .filter((v) => !Number.isNaN(v));

      if (
        cleanedResults.length % 2 !== 0 ||
        cleanedResults.length < 2 ||
        cleanedResults.length > 10
      ) {
        setErrorMsg(
          t("invalidResultFormat") ||
            "Format invalide. Entrez des paires a-b (min 1 set, max 5 sets)."
        );
        setIsEditing(true);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        result: cleanedResults,
        match_day: editDay || null,
        match_time: toHHMMSS(editTime) || null,
        table_number: editTable === "" ? null : Number(editTable),
      };

      if (ref1Dirty) {
        payload.referee1_id =
          localReferee1Id === "" || localReferee1Id === null
            ? null
            : Number(localReferee1Id);
      }
      if (ref2Dirty) {
        payload.referee2_id =
          localReferee2Id === "" || localReferee2Id === null
            ? null
            : Number(localReferee2Id);
      }

      const updated = await saveMatch(match.id, payload);

      let effective;
      if (Array.isArray(updated)) {
        if (
          updated.length > 0 &&
          updated[0] &&
          typeof updated[0] === "object"
        ) {
          effective = { ...match, ...updated[0] };
        } else {
          effective = { ...match, ...payload };
        }
      } else if (updated && typeof updated === "object") {
        effective = { ...match, ...updated };
      } else {
        effective = { ...match, ...payload };
      }

      const effectiveWithGroup = {
        ...effective,
        group_id:
          effective.group_id ?? match.group_id ?? match.group?.id ?? null,
      };

      console.log("[MatchRowResult] postProcessAfterSave payload", {
        matchId: match.id,
        effectiveWithGroup,
      });

      await postProcessAfterSave(effectiveWithGroup);
      onMatchChange(match.id, "match_day", effectiveWithGroup.match_day);
      onMatchChange(match.id, "match_time", effectiveWithGroup.match_time);
      onMatchChange(match.id, "table_number", effectiveWithGroup.table_number);
      if ("referee1_id" in effectiveWithGroup) {
        onMatchChange(match.id, "referee1_id", effectiveWithGroup.referee1_id);
      }
      if ("referee2_id" in effectiveWithGroup) {
        onMatchChange(match.id, "referee2_id", effectiveWithGroup.referee2_id);
      }
      onMatchChange(match.id, "result", effectiveWithGroup.result);

      if ("referee1_id" in effectiveWithGroup) {
        setLocalReferee1Id(
          effectiveWithGroup.referee1_id !== undefined &&
            effectiveWithGroup.referee1_id !== null
            ? effectiveWithGroup.referee1_id
            : ""
        );
      }
      if ("referee2_id" in effectiveWithGroup) {
        setLocalReferee2Id(
          effectiveWithGroup.referee2_id !== undefined &&
            effectiveWithGroup.referee2_id !== null
            ? effectiveWithGroup.referee2_id
            : ""
        );
      }
      setRef1Dirty(false);
      setRef2Dirty(false);

      // ✅ après un save réussi, cette ligne n'est plus dirty
      if (hasLocalChanges && typeof onDirtyChange === "function") {
        onDirtyChange(match.id, false);
      }
      setHasLocalChanges(false);

      onSave(effectiveWithGroup);

      if (!isBulkSaving && typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      alert(err.message || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr>
      <td className="text-center">{mnr ?? index + 1}</td>
      <td className="text-center">
        <input
          type="date"
          className="form-control form-control-sm text-center"
          value={editDay}
          onChange={(e) => {
            const val = e.target.value;
            setEditDay(val);
            markDirty(); // 👈 date modifiée → dirty
            if (onMatchChange) {
              onMatchChange(match.id, "match_day", val || null);
            }
          }}
        />
      </td>
      <td className="text-center">
        <input
          type="time"
          step="60"
          className="form-control form-control-sm text-center"
          value={editTime}
          onChange={(e) => {
            const val = e.target.value;
            setEditTime(val);
            markDirty(); // 👈 heure modifiée → dirty
            if (onMatchChange) {
              onMatchChange(match.id, "match_time", val || null);
            }
          }}
        />
      </td>
      <td className="text-center">
        <input
          type="number"
          min="1"
          className="form-control form-control-sm text-center"
          value={editTable}
          onChange={(e) => {
            const val = e.target.value;
            setEditTable(val);
            markDirty(); // 👈 table modifiée → dirty
            if (onMatchChange) {
              onMatchChange(
                match.id,
                "table_number",
                val === "" ? null : Number(val)
              );
            }
          }}
        />
      </td>
      <td className="text-center">
        {match?.group?.id ? (
          <Link to={`/tournament/${tournamentId}/groups/${match.group.id}`}>
            {match.group.name} |{" "}
            {(t(match.group.group_type) || match.group.group_type || "")
              .toString()
              .charAt(0)
              .toUpperCase()}
          </Link>
        ) : (
          <span role="text">—</span>
        )}
      </td>
      <td className="text-center">
        {match.player1 && match.player2 ? (
          <>
            <span
              role="text"
              aria-label={`${match.player1.firstname} ${match.player1.lastname}`}
            >
              {(() => {
                const ab = getClubAbbr(match.player1.club_id);
                const label = `${match.player1.lastname} ${
                  match.player1.firstname
                }${ab ? ` (${ab})` : ""}`;
                return tournamentId ? (
                  <Link
                    to={`/tournament/${tournamentId}/players/${match.player1.id}`}
                  >
                    {label}
                  </Link>
                ) : (
                  label
                );
              })()}
            </span>
            <span role="text" aria-label="versus">
              {" "}
              vs{" "}
            </span>
            <span
              role="text"
              aria-label={`${match.player2.firstname} ${match.player2.lastname}`}
            >
              {(() => {
                const ab = getClubAbbr(match.player2.club_id);
                const label = `${match.player2.lastname} ${
                  match.player2.firstname
                }${ab ? ` (${ab})` : ""}`;
                return tournamentId ? (
                  <Link
                    to={`/tournament/${tournamentId}/players/${match.player2.id}`}
                  >
                    {label}
                  </Link>
                ) : (
                  label
                );
              })()}
            </span>
          </>
        ) : (
          <>
            {match.player1_group_position &&
            match.player2_group_position &&
            match.group?.group_former ? (
              (() => {
                let formerArr = [];
                try {
                  formerArr = JSON.parse(match.group.group_former);
                } catch (_) {
                  return <span role="text">{t("notAssigned")}</span>;
                }

                const getLabel = (position) => {
                  const entry = formerArr[Number(position) - 1];
                  if (!entry) return position;
                  const groupId = entry[1];
                  const group = (allgroups || []).find(
                    (g) => Number(g.id) === Number(groupId)
                  );
                  return group
                    ? `${group.name}(${entry[0]})`
                    : `${groupId}(${entry[0]})`;
                };

                return (
                  <span role="text">
                    {getLabel(match.player1_group_position)} vs{" "}
                    {getLabel(match.player2_group_position)}
                  </span>
                );
              })()
            ) : (
              <span role="text">{t("notAssigned")}</span>
            )}
          </>
        )}
      </td>
      <td className="text-center">
        <span role="text">
          {points[0]} - {points[1]}
        </span>
      </td>
      <td className="text-center">
        <span role="text">
          {sets[0]} - {sets[1]}
        </span>
      </td>
      <td className="text-center">
        <span role="text">
          {goals[0]} - {goals[1]}
        </span>
      </td>
      <td className="text-center">
        {isEditing && match.player1 && match.player2 ? (
          <>
            <input
              type="text"
              className="form-control form-control-sm text-center"
              style={{ textAlign: "center" }}
              aria-invalid={!!errorMsg}
              placeholder="11-1-11-1"
              value={resultText}
              onChange={(e) => {
                const text = e.target.value.replace(/\s+/g, "");
                setResultText(text);
                markDirty(); // 👈 résultat modifié → dirty

                const parts = text
                  .split("-")
                  .map((v) => {
                    const n = parseInt(v.trim(), 10);
                    return Number.isNaN(n) ? "" : n.toString();
                  })
                  .filter((v) => v !== "");
                setLocalResults(parts);

                if (text.length === 0) {
                  setErrorMsg("");
                } else if (!isValidResultText(text)) {
                  setErrorMsg(
                    t("invalidResultFormatShort") ||
                      "Format: a-b ou a-b-a-b (jusqu'à 5 sets)."
                  );
                } else {
                  setErrorMsg("");
                }
              }}
            />
            {errorMsg && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-1 small text-danger"
              >
                {errorMsg}
              </div>
            )}
          </>
        ) : (
          <div
            role="button"
            onClick={() => {
              if (match.player1 && match.player2) setIsEditing(true);
            }}
            style={{
              cursor:
                match.player1 && match.player2 ? "pointer" : "not-allowed",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              justifyContent: "center",
            }}
          >
            {localResults.filter((v) => v !== "").length > 0
              ? localResults
                  .reduce((acc, curr, idx) => {
                    if (idx % 2 === 0) {
                      acc.push([curr]);
                    } else {
                      acc[acc.length - 1].push(curr);
                    }
                    return acc;
                  }, [])
                  .filter(([a, b]) => a || b)
                  .map(([a, b], i) => (
                    <span key={i} role="text">
                      {a || "—"}-{b || "—"}
                      {i <
                      Math.floor(
                        localResults.filter((v) => v !== "").length / 2
                      ) -
                        1
                        ? "; "
                        : ""}
                    </span>
                  ))
              : "edit"}
          </div>
        )}
      </td>
      <td className="text-center">
        <select
          disabled={!match.player1 || !match.player2}
          className="form-select form-select-sm mb-1"
          style={{ textAlign: "center" }}
          value={localReferee1Id === null ? "" : String(localReferee1Id)}
          onChange={(e) => {
            const val = e.target.value;
            setLocalReferee1Id(val === "" ? "" : val);
            setRef1Dirty(true);
            markDirty(); // 👈 arbitre 1 modifié → dirty
            onMatchChange(match.id, "referee1_id", val ? Number(val) : null);
          }}
        >
          <option value="">{t("none")}</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.lastname} {r.firstname}
            </option>
          ))}
        </select>

        <select
          disabled={!match.player1 || !match.player2}
          className="form-select form-select-sm"
          style={{ textAlign: "center" }}
          value={localReferee2Id === null ? "" : String(localReferee2Id)}
          onChange={(e) => {
            const val = e.target.value;
            setLocalReferee2Id(val === "" ? "" : val);
            setRef2Dirty(true);
            markDirty(); // 👈 arbitre 2 modifié → dirty
            onMatchChange(match.id, "referee2_id", val ? Number(val) : null);
          }}
        >
          <option value="">{t("none")}</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.lastname} {r.firstname}
            </option>
          ))}
        </select>
      </td>
      <td className="text-center">
        {!match.player1 || !match.player2 ? (
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled
            title={t("notAssigned")}
          >
            edit
          </button>
        ) : isEditing ? (
          <button
            className="btn btn-sm btn-success"
            disabled={loading || (resultText && !isValidResultText(resultText))}
            title={
              resultText && !isValidResultText(resultText)
                ? t("invalidResultFormatShort") || "Corrigez le format a-b-a-b"
                : undefined
            }
            onClick={() => {
              handleSave();
              if (!resultText || isValidResultText(resultText))
                setIsEditing(false);
            }}
          >
            save
          </button>
        ) : localResults.every((v) => v === "") ? (
          <button
            className="btn btn-sm btn-success"
            disabled={loading || (resultText && !isValidResultText(resultText))}
            title={
              resultText && !isValidResultText(resultText)
                ? t("invalidResultFormatShort") || "Corrigez le format a-b-a-b"
                : undefined
            }
            onClick={() => {
              handleSave();
              if (!resultText || isValidResultText(resultText))
                setIsEditing(true);
            }}
          >
            save
          </button>
        ) : (
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            edit
          </button>
        )}
      </td>
    </tr>
  );
};

export default MatchRowResult;
