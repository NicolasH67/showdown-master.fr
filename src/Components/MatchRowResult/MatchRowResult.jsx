import React, { useState, useEffect } from "react";
import supabase from "../../Helpers/supabaseClient";

const MatchRowResult = ({ match, index, referees, onMatchChange, onSave }) => {
  const [isEditing, setIsEditing] = useState(
    !match.result || match.result.length === 0
  );
  const [localResults, setLocalResults] = useState({
    player1: Array(5).fill(""),
    player2: Array(5).fill(""),
  });
  const [loading, setLoading] = useState(false);
  const hasResults =
    localResults.player1.some((val) => val.trim() !== "") ||
    localResults.player2.some((val) => val.trim() !== "");

  useEffect(() => {
    const p1 = [],
      p2 = [];
    for (let i = 0; i < 5; i++) {
      p1[i] = match.result?.[2 * i]?.toString() || "";
      p2[i] = match.result?.[2 * i + 1]?.toString() || "";
    }
    setLocalResults({ player1: p1, player2: p2 });
  }, [match.result]);

  const handleInput = (player, idx, value) => {
    setLocalResults((prev) => {
      const arr = [...prev[player]];
      arr[idx] = value;
      return { ...prev, [player]: arr };
    });
  };

  const handleSave = async () => {
    const flattened = [];
    for (let i = 0; i < 5; i++) {
      const v1 = localResults.player1[i].trim();
      const v2 = localResults.player2[i].trim();
      flattened.push(v1 === "" ? null : parseInt(v1, 10));
      flattened.push(v2 === "" ? null : parseInt(v2, 10));
    }
    // Remove all null entries so we only send actual scores
    const cleanedResults = flattened.filter((v) => v !== null);
    console.log("Cleaned results to submit:", cleanedResults);
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
        .select("*") // <— ajoutez select pour récupérer la ligne
        .maybeSingle(); // <— optionnel, pour obtenir directement un objet

      if (error) {
        console.error("Supabase error status", status, "—", error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Aucune donnée renvoyée après la mise à jour.");
      }

      onSave(data);
      if (hasResults) {
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Saving error:", err);
      alert("Erreur lors de l'enregistrement : " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <strong>Match #{index + 1}</strong> — G${match.group.name} | Table{" "}
          {match.table_number}
        </div>
        <div>
          <span className="me-3">
            <i className="bi bi-calendar-date"></i> {match.match_day}
          </span>
          <span>
            <i className="bi bi-clock"></i> {match.match_time}
          </span>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {/* Player 1 block */}
          <div className="col-md-6">
            <h6>
              {match.player1.firstname} {match.player1.lastname}
            </h6>
            <div className="d-flex flex-wrap mb-1">
              {Array.from({ length: 5 }, (_, idx) => (
                <div
                  key={idx}
                  className="text-center fw-bold me-2"
                  style={{ width: "60px" }}
                >
                  Set {idx + 1}
                </div>
              ))}
            </div>
            <div className="d-flex flex-wrap">
              {isEditing
                ? localResults.player1.map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      className="form-control form-control-sm text-center me-2 mb-2"
                      style={{ width: "60px" }}
                      value={val}
                      onChange={(e) =>
                        handleInput("player1", idx, e.target.value)
                      }
                    />
                  ))
                : localResults.player1.map((val, idx) => (
                    <div
                      key={idx}
                      className="border rounded text-center me-2 mb-2 p-2"
                      style={{ width: "60px" }}
                    >
                      {val}
                    </div>
                  ))}
            </div>
          </div>
          {/* Player 2 block */}
          <div className="col-md-6">
            <h6>
              {match.player2.firstname} {match.player2.lastname}
            </h6>
            <div className="d-flex flex-wrap mb-1">
              {Array.from({ length: 5 }, (_, idx) => (
                <div
                  key={idx}
                  className="text-center fw-bold me-2"
                  style={{ width: "60px" }}
                >
                  Set {idx + 1}
                </div>
              ))}
            </div>
            <div className="d-flex flex-wrap">
              {isEditing
                ? localResults.player2.map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      className="form-control form-control-sm text-center me-2 mb-2"
                      style={{ width: "60px" }}
                      value={val}
                      onChange={(e) =>
                        handleInput("player2", idx, e.target.value)
                      }
                    />
                  ))
                : localResults.player2.map((val, idx) => (
                    <div
                      key={idx}
                      className="border rounded text-center me-2 mb-2 p-2"
                      style={{ width: "60px" }}
                    >
                      {val}
                    </div>
                  ))}
            </div>
          </div>
        </div>
        <div className="row mt-3">
          <div className="col-md-4">
            <label className="form-label">Arbitres</label>
            <select
              disabled={!isEditing}
              className="form-select form-select-sm mb-2"
              value={match.referee1_id || ""}
              onChange={(e) =>
                onMatchChange(
                  match.id,
                  "referee1_id",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">Aucun</option>
              {referees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstname} {r.lastname}
                </option>
              ))}
            </select>
            <select
              disabled={!isEditing}
              className="form-select form-select-sm"
              value={match.referee2_id || ""}
              onChange={(e) =>
                onMatchChange(
                  match.id,
                  "referee2_id",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">Aucun</option>
              {referees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstname} {r.lastname}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-8 d-flex align-items-end justify-content-end">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={loading}
                className={`btn ${hasResults ? "btn-success" : "btn-primary"}`}
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-outline-secondary"
              >
                Modifier les résultats
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchRowResult;
