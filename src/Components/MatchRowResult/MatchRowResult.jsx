import React from "react";

const MatchRowResult = ({
  match,
  index,
  referees,
  results,
  onMatchChange,
  onResultChange,
  onSave,
  onResultSubmit,
}) => {
  return (
    <>
      <tr className="align-middle">
        <td rowSpan="2">{index + 1}</td>
        <td rowSpan="2">
          <input
            type="date"
            className="form-control"
            value={match.match_day}
            onChange={(e) =>
              onMatchChange(match.id, "match_day", e.target.value)
            }
          />
        </td>
        <td rowSpan="2">
          <input
            type="time"
            className="form-control"
            value={match.match_time}
            onChange={(e) =>
              onMatchChange(match.id, "match_time", e.target.value)
            }
          />
        </td>
        <td rowSpan="2">
          <input
            type="number"
            className="form-control"
            value={match.table_number}
            onChange={(e) =>
              onMatchChange(match.id, "table_number", e.target.value)
            }
            style={{ width: "50px" }}
          />
        </td>
        <td rowSpan="2">{match.group.name}</td>
        <td>
          {match.player1.firstname} {match.player1.lastname}
        </td>
        <td>
          {[...Array(5)].map((_, setIndex) => (
            <input
              key={setIndex}
              type="text"
              className="form-control d-inline-block"
              value={
                results[match.id]?.player1?.[setIndex] !== undefined
                  ? results[match.id]?.player1?.[setIndex]
                  : ""
              }
              onChange={(e) =>
                onResultChange(match.id, setIndex, "player1", e.target.value)
              }
              aria-label={`Set ${setIndex + 1} joueur 1`}
              style={{ width: "50px", marginRight: "5px" }}
            />
          ))}
        </td>
        <td rowSpan="2">
          <select
            className="form-select"
            value={match.referee1_id || ""}
            onChange={(e) => {
              const value = e.target.value;
              onMatchChange(
                match.id,
                "referee1_id",
                value ? Number(value) : null
              );
            }}
          >
            <option value="">Aucun arbitre</option>
            {referees.map((referee) => (
              <option key={referee.id} value={referee.id}>
                {referee.firstname} {referee.lastname}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={match.referee2_id || ""}
            onChange={(e) => {
              const value = e.target.value;
              onMatchChange(
                match.id,
                "referee2_id",
                value ? Number(value) : null
              );
            }}
          >
            <option value="">Aucun arbitre</option>
            {referees.map((referee) => (
              <option key={referee.id} value={referee.id}>
                {referee.firstname} {referee.lastname}
              </option>
            ))}
          </select>
        </td>
        <td rowSpan="2">
          <button
            className="btn btn-primary"
            onClick={() => {
              onSave(match.id);
              onResultSubmit(match.id);
            }}
          >
            Enregistrer
          </button>
        </td>
      </tr>
      <tr className="align-middle">
        <td>
          {match.player2.firstname} {match.player2.lastname}
        </td>
        <td>
          {[...Array(5)].map((_, setIndex) => (
            <input
              key={setIndex}
              type="text"
              className="form-control d-inline-block"
              value={
                results[match.id]?.player2?.[setIndex] !== undefined
                  ? results[match.id]?.player2?.[setIndex]
                  : ""
              }
              onChange={(e) =>
                onResultChange(match.id, setIndex, "player2", e.target.value)
              }
              aria-label={`Set ${setIndex + 1} joueur 2`}
              style={{ width: "50px", marginRight: "5px" }}
            />
          ))}
        </td>
      </tr>
    </>
  );
};

export default MatchRowResult;
