import React, { useState, useEffect } from "react";
import supabase from "../../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";

const MatchRowResult = ({
  match,
  allgroups,
  index,
  referees,
  onMatchChange,
  onSave,
}) => {
  const { t } = useTranslation();
  const [localResults, setLocalResults] = useState(
    match.result?.map((v) => (v === null ? "" : v.toString())) ||
      Array(10).fill("")
  );
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  // Accepts 1 to 5 sets written as pairs: a-b-a-b-... (no trailing hyphen)
  const RESULT_REGEX = /^\d{1,2}-\d{1,2}(?:-\d{1,2}-\d{1,2}){0,4}$/;

  const isValidResultText = (text) => {
    const trimmed = (text || "").trim();
    if (!RESULT_REGEX.test(trimmed)) return false;
    // optional: cap total items to 10 (5 sets)
    const parts = trimmed.split("-");
    return parts.length >= 2 && parts.length <= 10 && parts.length % 2 === 0;
  };

  console.log(match);

  useEffect(() => {
    setLocalResults(
      match.result?.map((v) => (v === null ? "" : v.toString())) ||
        Array(10).fill("")
    );
    setResultText(
      match.result?.filter((v) => v !== null && v !== undefined).join("-") || ""
    );
  }, [match.result]);

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
    // Sinon (égalité), on garde [0, 0]

    return { points, sets, goals };
  };

  const parsedResults = localResults.map((v) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  });
  const { points, sets, goals } = calculateStats(parsedResults);

  const handleSave = async () => {
    // Validate before saving. Allow empty string to clear the result.
    const inputText = (resultText || "").trim();

    let cleanedResults = [];
    if (inputText === "") {
      // Empty input -> clear the result
      cleanedResults = [];
    } else {
      // Non-empty must match a-b(-a-b){0,4}
      if (!isValidResultText(inputText)) {
        setErrorMsg(
          t("invalidResultFormat") ||
            "Format invalide. Utilisez des paires a-b séparées par des tirets (ex: 11-1 ou 11-1-11-1), maximum 5 sets."
        );
        setIsEditing(true);
        return; // stop here, do not save
      }

      cleanedResults = inputText
        .split("-")
        .map((v) => parseInt(v, 10))
        .filter((v) => !Number.isNaN(v));

      // Safety: must be an even number of values (pairs) and between 2 and 10 numbers
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
      const { data, error, status } = await supabase
        .from("match")
        .update({
          result: cleanedResults,
          referee1_id: match.referee1_id,
          referee2_id: match.referee2_id,
        })
        .eq("id", match.id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error(status, "—", error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Aucune donnée renvoyée après la mise à jour.");
      }

      onSave(data);
    } catch (err) {
      alert(err.message || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr>
      <td className="text-center">{index + 1}</td>
      <td className="text-center">{match.match_day}</td>
      <td className="text-center">{match.match_time}</td>
      <td className="text-center">{match.table_number}</td>
      <td className="text-center">{match.group.name}</td>
      <td className="text-center">
        {match.player1 && match.player2 ? (
          <>
            <span
              role="text"
              aria-label={`${match.player1.firstname} ${match.player1.lastname}`}
            >
              {match.player1.firstname} {match.player1.lastname}
            </span>
            <span role="text" aria-label="versus">
              {" "}
              vs{" "}
            </span>
            <span
              role="text"
              aria-label={`${match.player2.firstname} ${match.player2.lastname}`}
            >
              {match.player2.firstname} {match.player2.lastname}
            </span>
          </>
        ) : (
          <>
            {match.player1_group_position &&
            match.player2_group_position &&
            match.group?.group_former ? (
              (() => {
                const former = JSON.parse(match.group.group_former);
                const getLabel = (position) => {
                  const entry = former[Number(position) - 1];
                  if (!entry) return position;
                  const groupId = entry[1];
                  const group = allgroups.find((g) => g.id === groupId);
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
                const text = e.target.value.replace(/\s+/g, ""); // remove spaces
                setResultText(text);

                // Update local array for preview while typing
                const parts = text
                  .split("-")
                  .map((v) => {
                    const n = parseInt(v.trim(), 10);
                    return Number.isNaN(n) ? "" : n.toString();
                  })
                  .filter((v) => v !== "");
                setLocalResults(parts);

                // Live validation message (optional while typing)
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
          value={match.referee1_id || ""}
          onChange={(e) =>
            onMatchChange(
              match.id,
              "referee1_id",
              e.target.value ? Number(e.target.value) : null
            )
          }
        >
          <option value="">{t("none")}</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.firstname} {r.lastname}
            </option>
          ))}
        </select>
        <select
          disabled={!match.player1 || !match.player2}
          className="form-select form-select-sm"
          style={{ textAlign: "center" }}
          value={match.referee2_id || ""}
          onChange={(e) =>
            onMatchChange(
              match.id,
              "referee2_id",
              e.target.value ? Number(e.target.value) : null
            )
          }
        >
          <option value="">{t("none")}</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.firstname} {r.lastname}
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
              // keep editing open only if invalid; handleSave returns early on invalid
              if (isValidResultText(resultText)) setIsEditing(false);
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
              if (isValidResultText(resultText)) setIsEditing(true);
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
