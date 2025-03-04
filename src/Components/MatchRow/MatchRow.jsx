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
      <td>{match.match_date}</td>
      <td>
        {new Date(`${match.match_date}T${match.match_time}`).toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )}
      </td>
      <td>{match.table_number}</td>
      <td>{match.division.name}</td>
      <td>
        {match.player1.firstname} {match.player1.lastname}
      </td>
      <td>
        {match.player2.firstname} {match.player2.lastname}
      </td>
      <td>{formatResult(match.result)}</td>
      <td>
        {match.referee_1?.firstname} {match.referee_1?.lastname}
        <br />
        {match.referee_2?.firstname} {match.referee_2?.lastname}
      </td>
    </tr>
  );
};

export default MatchRow;
