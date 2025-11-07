import React from "react";
import MatchList from "../MatchList/MatchList";
import { useTranslation } from "react-i18next";

// Small helpers
const safeParseJSON = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
};

const normalizePlayersByGroup = (players, groups) => {
  // If already a map { [groupId]: Player[] }, return as-is
  if (players && typeof players === "object" && !Array.isArray(players)) {
    return players;
  }
  const byGroup = {};
  (groups || []).forEach((g) => (byGroup[g.id] = []));
  (players || []).forEach((p) => {
    const raw = p?.group_id ?? p?.groupId ?? p?.group?.id;
    if (Array.isArray(raw)) {
      raw.forEach((gid) => {
        const k = Number(gid);
        if (byGroup[k]) byGroup[k].push(p);
      });
    } else if (raw !== undefined && raw !== null) {
      const k = Number(raw);
      if (byGroup[k]) byGroup[k].push(p);
    }
  });
  // stable order
  Object.keys(byGroup).forEach((k) =>
    byGroup[k].sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0))
  );
  return byGroup;
};

const buildClubLookup = (clubs) => {
  // Accepts array of clubs [{id, name, abbreviation}] or map {id: "ABR"}
  if (!clubs) return {};
  if (!Array.isArray(clubs) && typeof clubs === "object") return clubs;
  const map = {};
  (clubs || []).forEach((c) => {
    if (c && c.id != null) {
      map[c.id] = c.abbreviation || c.name || String(c.id);
    }
  });
  return map;
};

const findPlayerId = (match, which) => {
  // which: 1 | 2
  // accept both flat ids (player1_id) and nested objects (player1.id)
  if (which === 1) return match?.player1_id ?? match?.player1?.id ?? null;
  return match?.player2_id ?? match?.player2?.id ?? null;
};

const GroupList = ({
  groups = [],
  players = [],
  playersByGroup,
  clubs = [],
  matches = {},
  group_former,
  generateMatches,
  generatedMatches = {},
  updateGeneratedMatch,
  saveMatches,
  allGroups = [],
  onEditMatch,
  onDeleteMatch,
  tournamentStartDate,
}) => {
  const { t } = useTranslation();

  const playersMap = React.useMemo(
    () => normalizePlayersByGroup(playersByGroup ?? players, groups),
    [playersByGroup, players, groups]
  );

  const clubNameById = React.useMemo(() => buildClubLookup(clubs), [clubs]);

  const renderGroupFormerRows = (group) => {
    const parsed = safeParseJSON(group.group_former);
    if (!Array.isArray(parsed)) {
      return (
        <tr>
          <td colSpan="2" className="text-center">
            {t("groupFormerError")}
          </td>
        </tr>
      );
    }
    return parsed.map(([position, refGroupId], index) => {
      const found = (allGroups || []).find(
        (g) => Number(g.id) === Number(refGroupId)
      );
      return (
        <tr key={`former-${group.id}-${index}`}>
          <td>{index + 1}</td>
          <td>
            {found
              ? `${found.name}(${position})`
              : `${t("group")} ${refGroupId}(${position})`}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="container mt-4">
      <div className="row">
        {(groups || []).map((group) => {
          const groupPlayers = playersMap[group.id] || [];
          const existingMatches = matches[group.id] || [];
          const generated = generatedMatches[group.id] || [];

          return (
            <div key={group.id} className="mb-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title text-primary text-center">
                    {group.name} - {t(group.group_type)}
                  </h5>

                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("ranking")}</th>
                        <th>{t("namePlayerTable")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupPlayers.length > 0 ? (
                        groupPlayers.map((player, index) => (
                          <tr key={player.id ?? `${group.id}-p-${index}`}>
                            <td>{index + 1}</td>
                            <td>
                              {player.lastname} {player.firstname} (
                              {player.club?.abbreviation ||
                                clubNameById[player.club_id] ||
                                "N/A"}
                              )
                            </td>
                          </tr>
                        ))
                      ) : group.group_former ? (
                        renderGroupFormerRows(group)
                      ) : (
                        <tr>
                          <td colSpan="2" className="text-center text-muted">
                            {t("messageNoPlayersInGroup")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {generated.length > 0 && (
                    <MatchList
                      matches={generated}
                      players={groupPlayers}
                      groupId={group.id}
                      updateGeneratedMatch={updateGeneratedMatch}
                      saveMatches={saveMatches}
                      tournamentStartDate={tournamentStartDate}
                    />
                  )}

                  {existingMatches.length > 0 && (
                    <div className="mt-4">
                      <h5>{t("existingMatches")}</h5>
                      <div className="table-responsive mt-3">
                        <table className="table table-bordered">
                          <thead>
                            <tr>
                              <th className="text-center">{t("date")}</th>
                              <th className="text-center">{t("time")}</th>
                              <th className="text-center">{t("table")}</th>
                              <th className="text-center">{t("group")}</th>
                              <th className="text-center">{t("player1")}</th>
                              <th className="text-center">{t("player2")}</th>
                              <th className="text-center">{t("action")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {existingMatches.map((match) => {
                              const p1Id = findPlayerId(match, 1);
                              const p2Id = findPlayerId(match, 2);
                              const player1 = (groupPlayers || []).find(
                                (p) => p.id === p1Id
                              );
                              const player2 = (groupPlayers || []).find(
                                (p) => p.id === p2Id
                              );

                              const fallbackFromFormer = (pos) => {
                                if (!group.group_former)
                                  return t("notAssigned");
                                const parsed = safeParseJSON(
                                  group.group_former
                                );
                                if (!Array.isArray(parsed))
                                  return t("notAssigned");
                                const entry = parsed[(Number(pos) || 0) - 1];
                                if (!entry) return t("notAssigned");
                                const ref = (allGroups || []).find(
                                  (g) => g.id === entry[1]
                                );
                                return ref
                                  ? `${ref.name}(${entry[0]})`
                                  : `${t("group")} ${entry[1]}(${entry[0]})`;
                              };

                              return (
                                <tr key={match.id}>
                                  <td className="text-center">
                                    {match.match_day}
                                  </td>
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
                                  <td className="text-center">
                                    {match.table_number}
                                  </td>
                                  <td className="text-center">{group.name}</td>
                                  <td className="text-center">
                                    {player1
                                      ? `${player1.lastname} ${player1.firstname}`
                                      : fallbackFromFormer(
                                          match.player1_group_position
                                        )}
                                  </td>
                                  <td className="text-center">
                                    {player2
                                      ? `${player2.lastname} ${player2.firstname}`
                                      : fallbackFromFormer(
                                          match.player2_group_position
                                        )}
                                  </td>
                                  <td className="text-center">
                                    <button
                                      className="btn btn-sm btn-outline-primary me-2"
                                      onClick={() => onEditMatch(match)}
                                    >
                                      {t("edit")}
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => onDeleteMatch(match)}
                                    >
                                      {t("delete")}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-primary w-100"
                    onClick={() => generateMatches(group.id)}
                  >
                    {t("matchesGenerate")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupList;
