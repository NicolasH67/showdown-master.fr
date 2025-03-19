import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import supabase from "../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";

const useMatchData = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [groups, setGroups] = useState([]);
  const [players, setPlayers] = useState({});
  const [matches, setMatches] = useState({});
  const [clubs, setClubs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError(t("tournamentNotFound"));
      return;
    }

    const fetchData = async () => {
      try {
        const { data: group, error: groupsError } = await supabase
          .from("group")
          .select("*")
          .eq("tournament_id", id);

        if (groupsError) throw groupsError;

        const { data: playersData, error: playersError } = await supabase
          .from("player")
          .select("*")
          .eq("tournament_id", id);

        if (playersError) throw playersError;

        const { data: matchesData, error: matchesError } = await supabase
          .from("match")
          .select("*")
          .eq("tournament_id", id);

        if (matchesError) throw matchesError;

        const { data: clubsData, error: clubsError } = await supabase
          .from("club")
          .select("id, abbreviation");

        if (clubsError) throw clubsError;

        const clubsMap = Object.fromEntries(
          clubsData.map((club) => [club.id, club.abbreviation])
        );
        setClubs(clubsMap);

        const playersByGroup = playersData.reduce((acc, player) => {
          if (player.group_id) {
            acc[player.group_id] = acc[player.group_id] || [];
            acc[player.group_id].push(player);
          }
          return acc;
        }, {});

        const matchesByGroup = matchesData.reduce((acc, match) => {
          if (match.group_id) {
            acc[match.group_id] = acc[match.group_id] || [];
            acc[match.group_id].push(match);
          }
          return acc;
        }, {});

        setGroups(group);
        setPlayers(playersByGroup);
        setMatches(matchesByGroup);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return { groups, players, matches, clubs, loading, error };
};

export default useMatchData;
