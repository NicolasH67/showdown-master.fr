import React, { useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/**
 * `MatchRow` Component
 * @component
 * @param {Object} props - Component properties.
 * @param {Object} props.match - Match details.
 * @param {number} props.index - Index of the match in the list.
 * @param {Function} props.formatResult - Function to format match results.
 * @returns {JSX.Element} A table row displaying a match's details.
 */
const safeParseJSON = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
};

const MatchRow = ({
  match,
  index,
  formatResult,
  allgroups,
  allclubs,
  tournamentId,
  isLastWithResult = false,
}) => {
  const { t } = useTranslation();

  // Ref used to scroll to the last match that has a result
  const rowRef = useRef(null);

  useEffect(() => {
    if (!isLastWithResult || !rowRef.current) return;

    const timer = setTimeout(() => {
      if (rowRef.current) {
        rowRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 250); // delay to let other layout/scroll effects finish

    return () => clearTimeout(timer);
  }, [isLastWithResult]);

  const getClubAbbr = (clubId) => {
    if (!clubId || !Array.isArray(allclubs)) return "";
    const club = allclubs.find((c) => Number(c.id) === Number(clubId));
    if (!club) return "";
    // Try common abbreviation fields, then fallback to name's first word
    const abbr =
      club.abbr ||
      club.abbreviation ||
      club.short_name ||
      club.shortname ||
      club.code ||
      club.slug ||
      (typeof club.name === "string" ? club.name.split(" ")[0] : "");
    return abbr ? String(abbr).toUpperCase() : "";
  };
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
    <tr ref={rowRef}>
      <td className="text-center">{match.match_day}</td>
      <td className="text-center">
        {match.match_time
          ? new Date(
              `${match.match_day}T${match.match_time}`
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--"}
      </td>
      <td className="text-center">{match.table_number}</td>
      <td className="text-center">
        {match.group ? (
          <Link to={`/tournament/${tournamentId}/groups/${match.group.id}`}>
            {match.group.name} |{" "}
            {t(match.group.group_type)?.charAt(0)?.toUpperCase()}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className="text-center">
        <span role="text">
          {match.player1
            ? (() => {
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
              })()
            : match.group?.group_former && match.player1_group_position
            ? (() => {
                const former = safeParseJSON(match.group.group_former) || [];
                const entry = Array.isArray(former)
                  ? former[Number(match.player1_group_position) - 1]
                  : null;
                if (!entry) return match.player1_group_position;
                const group = allgroups?.find(
                  (g) => Number(g.id) === Number(entry[1])
                );
                return group
                  ? `${group.name}(${entry[0]})`
                  : `${entry[1]}(${entry[0]})`;
              })()
            : "—"}
        </span>
      </td>
      <td className="text-center">
        <span role="text">
          {match.player2
            ? (() => {
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
              })()
            : match.group?.group_former && match.player2_group_position
            ? (() => {
                const former = safeParseJSON(match.group.group_former) || [];
                const entry = Array.isArray(former)
                  ? former[Number(match.player2_group_position) - 1]
                  : null;
                if (!entry) return match.player2_group_position;
                const group = allgroups?.find(
                  (g) => Number(g.id) === Number(entry[1])
                );
                return group
                  ? `${group.name}(${entry[0]})`
                  : `${entry[1]}(${entry[0]})`;
              })()
            : "—"}
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
          {match.referee_1?.lastname} {match.referee_1?.firstname}
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
              {match.referee_2?.lastname} {match.referee_2?.firstname}
            </span>
          </>
        )}
      </td>
    </tr>
  );
};

export default MatchRow;
