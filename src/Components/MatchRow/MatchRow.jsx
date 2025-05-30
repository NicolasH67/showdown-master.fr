import React from "react";

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
  return (
    <tr>
      <td>{match.match_day}</td>
      <td>
        {new Date(`${match.match_day}T${match.match_time}`).toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )}
      </td>
      <td>{match.table_number}</td>
      <td>{match.group.name}</td>
      <td>
        <p>
          {match.player1.firstname} {match.player1.lastname}
        </p>
      </td>
      <td>
        {match.player2.firstname} {match.player2.lastname}
      </td>
      <td>{formatResult(match.result)}</td>
      <td style={{ textAlign: "center" }}>
        {match.referee_1?.firstname} {match.referee_1?.lastname}
        {match.referee_2 && (
          <>
            <div
              style={{
                borderTop: "2px solid black",
                width: "100%",
                margin: "5px 0",
              }}
            />
            {match.referee_2?.firstname} {match.referee_2?.lastname}
          </>
        )}
      </td>
    </tr>
  );
};

export default MatchRow;
