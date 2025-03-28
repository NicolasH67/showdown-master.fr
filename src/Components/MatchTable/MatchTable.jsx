import React from "react";
import MatchRow from "../MatchRow/MatchRow";
import { useTranslation } from "react-i18next";

/**
 * `MatchTable` Component
 * @component
 * @param {Object} props - Component properties.
 * @param {Array} props.matches - List of matches.
 * @returns {JSX.Element} A Bootstrap-styled table displaying match details.
 */
const MatchTable = ({ matches }) => {
  const { t } = useTranslation();
  const formatResult = (resultArray) => {
    if (!resultArray || resultArray.length === 0) return t("noResult");
    const formattedResult = [];
    for (let i = 0; i < resultArray.length; i += 2) {
      formattedResult.push(`${resultArray[i]}:${resultArray[i + 1]}`);
    }
    return formattedResult.join("; ");
  };

  if (matches.length === 0) {
    return (
      <div className="alert alert-warning text-center">
        {t("noMatchesAvailable")}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>{t("date")}</th>
            <th>{t("time")}</th>
            <th>{t("table")}</th>
            <th>{t("group")}</th>
            <th>{t("player1")}</th>
            <th>{t("player2")}</th>
            <th>{t("result")}</th>
            <th>{t("referees")}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, index) => (
            <MatchRow
              key={match.id}
              match={match}
              index={index}
              formatResult={formatResult}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchTable;
