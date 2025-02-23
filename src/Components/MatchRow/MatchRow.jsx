import React from "react";

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
      </td>
    </tr>
  );
};

export default MatchRow;
