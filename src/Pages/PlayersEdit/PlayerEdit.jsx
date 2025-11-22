import { useState, useEffect } from "react";

export default function useTournamentData(
  tournamentId,
  refreshTrigger = false
) {
  const [groups, setGroups] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const groupsResponse = await fetch(
          `/api/tournaments/${tournamentId}/groups`
        );
        const clubsResponse = await fetch(
          `/api/tournaments/${tournamentId}/clubs`
        );
        const playersResponse = await fetch(
          `/api/tournaments/${tournamentId}/players`
        );
        const refereesResponse = await fetch(
          `/api/tournaments/${tournamentId}/referees`
        );

        if (!groupsResponse.ok) throw new Error("Failed to fetch groups");
        if (!clubsResponse.ok) throw new Error("Failed to fetch clubs");
        if (!playersResponse.ok) throw new Error("Failed to fetch players");
        if (!refereesResponse.ok) throw new Error("Failed to fetch referees");

        const groupsData = await groupsResponse.json();
        const clubsData = await clubsResponse.json();
        const playersData = await playersResponse.json();
        const refereesData = await refereesResponse.json();

        if (!cancelled) {
          setGroups(groupsData);
          setClubs(clubsData);
          setPlayers(playersData);
          setReferees(refereesData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [tournamentId, refreshTrigger]);

  return { groups, clubs, players, referees, loading, error };
}
