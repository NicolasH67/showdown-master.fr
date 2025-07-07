import React, { useMemo } from "react";

/**
 * `MatchRow` Component
 * @component
 * @param {Object} props - Component properties.
 * @param {Object} props.match - Match details.
 * @param {number} props.index - Index of the match in the list.
 * @param {Function} props.formatResult - Function to format match results.
 * @returns {JSX.Element} A table row displaying a match's details.
 */
const MatchRow = ({ match, index, formatResult }) => {
  const calculateStats = (result) => {
    let points = [0, 0];
    let sets = [0, 0];
    let goals = [0, 0];

    if (!result || result.length === 0) {
      return { points, sets, goals };
    }

    for (let i = 0; i < result.length; i += 2) {
      const score1 = result[i];
      const score2 = result[i + 1];

      if (score1 == null || score2 == null) continue;

      goals[0] += score1;
      goals[1] += score2;

      if (score1 > score2) {
        sets[0]++;
        points[0] = 1;
        points[1] = 0;
      } else if (score2 > score1) {
        sets[1]++;
        points[0] = 0;
        points[1] = 1;
      } else {
        points[0] = 0;
        points[1] = 0;
      }
    }

    return { points, sets, goals };
  };

  const resultArray = useMemo(() => {
    if (!match.result) return [];
    return match.result.filter((r) => r !== null).map((r) => parseInt(r, 10));
  }, [match.result]);

  const { points, sets, goals } = useMemo(
    () => calculateStats(resultArray),
    [resultArray]
  );

  return (
    <tr>
      <td className="text-center">{match.match_day}</td>
      <td className="text-center">
        {new Date(`${match.match_day}T${match.match_time}`).toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )}
      </td>
      <td className="text-center">{match.table_number}</td>
      <td className="text-center">{match.group.name}</td>
      <td className="text-center">
        <span role="text">
          {match.player1.firstname} {match.player1.lastname}
        </span>
      </td>
      <td className="text-center">
        <span role="text">
          {match.player2.firstname} {match.player2.lastname}
        </span>
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
      <td className="text-center">{formatResult(match.result)}</td>
      <td style={{ textAlign: "center" }}>
        <span role="text">
          {match.referee_1?.firstname} {match.referee_1?.lastname}
        </span>
        {match.referee_2 && (
          <>
            <div
              style={{
                borderTop: "2px solid black",
                width: "100%",
                margin: "5px 0",
              }}
            />
            <span role="text">
              {match.referee_2?.firstname} {match.referee_2?.lastname}
            </span>
          </>
        )}
      </td>
    </tr>
  );
};

export default MatchRow;
