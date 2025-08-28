import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import supabase from "../../Helpers/supabaseClient";
import GroupsSection from "../../Components/GroupsSection/GroupsSection";
import MatchRow from "../../Components/MatchRow/MatchRow";

/**
 * GroupsDetails – Détails d'un groupe :
 *  1) Classement du groupe (règles identiques à GroupTable)
 *  2) Liste de tous les matchs du groupe
 *
 * Règles de classement :
 *  - Tri principal : nombre de victoires
 *  - Égalité 2 ou 3 joueurs : confrontation directe -> diff sets, puis diff buts (goals)
 *  - Sinon : ordre alphabétique (lastname)
 */

const GroupsDetails = () => {
  const { t } = useTranslation();
  const { id, groupId } = useParams(); // /tournament/:id/groups/:groupId
  const [group, setGroup] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Fetch data -------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // 1) Group
        const { data: groupData, error: gErr } = await supabase
          .from("group")
          .select("*")
          .eq("id", groupId)
          .single();
        if (gErr) throw gErr;

        // Load all groups of the tournament (for group_former display)
        const { data: allGroupsData, error: agErr } = await supabase
          .from("group")
          .select("id, name")
          .eq("tournament_id", id);
        if (agErr) throw agErr;

        // Load all clubs of the tournament (for club abbreviations)
        const { data: allClubsData, error: cErr } = await supabase
          .from("club")
          .select("*")
          .eq("tournament_id", id);
        if (cErr) throw cErr;

        // 2) Players of this group (players have group_id int[])
        const { data: playersData, error: pErr } = await supabase
          .from("player")
          .select("id, firstname, lastname, club_id, group_id")
          .eq("tournament_id", id)
          .contains("group_id", [Number(groupId)]);
        if (pErr) throw pErr;

        // 3) Matches of the group (basic fields; we'll enrich players below)
        const { data: matchesData, error: mErr } = await supabase
          .from("match")
          .select(
            "id, match_day, match_time, table_number, result, player1_id, player2_id, player1_group_position, player2_group_position, referee1_id, referee2_id"
          )
          .eq("group_id", groupId)
          .order("match_day", { ascending: true })
          .order("match_time", { ascending: true })
          .order("table_number", { ascending: true });
        if (mErr) throw mErr;

        // Load referees referenced in these matches to enrich display
        const refIds = Array.from(
          new Set(
            (matchesData || [])
              .flatMap((m) => [m.referee1_id, m.referee2_id])
              .filter(Boolean)
          )
        );
        let refsMap = new Map();
        if (refIds.length > 0) {
          const { data: refs, error: rErr } = await supabase
            .from("referee")
            .select("id, firstname, lastname")
            .in("id", refIds);
          if (rErr) throw rErr;
          (refs || []).forEach((r) => refsMap.set(Number(r.id), r));
        }

        // Build a players map from playersData (and optionally augment with any extra ids found in matches)
        const playersMap = new Map();
        (playersData || []).forEach((p) => playersMap.set(String(p.id), p));

        // If some matches reference players not returned by the group filter (edge cases), we fetch them to enrich display only
        const referencedIds = Array.from(
          new Set(
            (matchesData || [])
              .flatMap((m) => [m.player1_id, m.player2_id])
              .filter(Boolean)
              .map((v) => Number(v))
          )
        );
        const missingIds = referencedIds.filter(
          (pid) => !playersMap.has(String(pid))
        );
        if (missingIds.length > 0) {
          const { data: extraPlayers, error: extraErr } = await supabase
            .from("player")
            .select("id, firstname, lastname, club_id, group_id")
            .in("id", missingIds);
          if (extraErr) throw extraErr;
          (extraPlayers || []).forEach((p) => playersMap.set(String(p.id), p));
        }

        // 4) Attach players into matches
        const enrichedMatches = (matchesData || []).map((m) => ({
          ...m,
          player1: m.player1_id
            ? playersMap.get(String(m.player1_id)) || null
            : null,
          player2: m.player2_id
            ? playersMap.get(String(m.player2_id)) || null
            : null,
          referee_1: m.referee1_id
            ? refsMap.get(Number(m.referee1_id)) || null
            : null,
          referee_2: m.referee2_id
            ? refsMap.get(Number(m.referee2_id)) || null
            : null,
          group: groupData,
        }));

        // 5) Players of the group (from appearances in matches)
        const playerSet = new Map();
        enrichedMatches.forEach((m) => {
          if (m.player1) playerSet.set(String(m.player1.id), m.player1);
          if (m.player2) playerSet.set(String(m.player2.id), m.player2);
        });

        if (isMounted) {
          setGroup(groupData);
          setMatches(enrichedMatches);
          setPlayers(playersData || Array.from(playerSet.values()));
          setAllGroups(allGroupsData || []);
          setAllClubs(allClubsData || []);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) setError(e.message || String(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (groupId) fetchData();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  // --- Render -----------------------------------------------------------
  if (loading) return <div className="p-4">{t("loading") || "Loading..."}</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!group) return <div className="p-4">{t("notFound") || "Not found"}</div>;

  const groupTitle = `${group.name || "?"} ${
    group.group_type ? `| ${t(group.group_type)}` : ""
  }`;

  const renderPlayerLink = (p) => {
    if (!p) return "—";
    const label = `${p.firstname} ${p.lastname}`;
    return <Link to={`/tournament/${id}/players/${p.id}`}>{label}</Link>;
  };

  const formatTime = (m) => {
    const d = m.match_day || "";
    const h = m.match_time ? m.match_time.substring(0, 5) : "";
    return `${d} ${h}`.trim();
  };

  const formatResult = (result) => {
    if (!result || !Array.isArray(result) || result.length < 2) return "-";
    const sets = [];
    for (let i = 0; i < result.length; i += 2) {
      const playerAScore = result[i];
      const playerBScore = result[i + 1];
      if (playerBScore !== undefined) {
        sets.push(`${playerAScore}-${playerBScore}`);
      }
    }
    return sets.join(" ; ");
  };

  return (
    <div className="p-4 space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-3">
          {t("groupRanking") || "Classement du groupe"}
        </h2>
        <div className="overflow-x-auto">
          <GroupsSection
            groups={[group]}
            players={players}
            matches={matches}
            allGroups={allGroups}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">
          {t("groupMatches") || "Matchs du groupe"}
        </h2>
        <div className="overflow-x-auto">
          <table className="table table-striped table-bordered">
            <thead className="table-dark">
              <tr>
                <th className="text-center">{t("date")}</th>
                <th className="text-center">{t("time")}</th>
                <th className="text-center">{t("table")}</th>
                <th className="text-center">{t("group")}</th>
                <th className="text-center">{t("player1")}</th>
                <th className="text-center">{t("player2")}</th>
                <th className="text-center">{t("point")}</th>
                <th className="text-center">{t("set")}</th>
                <th className="text-center">{t("goal")}</th>
                <th className="text-center">{t("result")}</th>
                <th className="text-center">{t("referees")}</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, index) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  index={index}
                  formatResult={formatResult}
                  allgroups={allGroups}
                  allclubs={allClubs}
                  tournamentId={id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default GroupsDetails;
