import { useState, useEffect } from "react";
import useClub from "./useClub";
import useMatches from "./useMatchs";

/**
 * Hook to fetch a club's details along with the matches they played.
 *
 * @param {string} clubId - The ID of the club.
 * @param {string} tournamentId - The ID of the tournament to filter matches.
 * @returns {Object}
 * - club: The club's details.
 * - matches: The list of matches the club played, sorted by date and time.
 * - loading: A boolean indicating if data is still being fetched.
 * - error: An error object if an error occurred during fetching.
 */
const useClubMatches = (clubId, tournamentId) => {
  const {
    clubs,
    loading: clubsLoading,
    error: clubsError,
  } = useClub(tournamentId);
  const {
    matches,
    loading: matchesLoading,
    error: matchesError,
  } = useMatches();

  const [club, setClub] = useState(null);
  const [clubMatches, setClubMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (clubsError || matchesError) {
      setError(clubsError || matchesError);
      setLoading(false);
      return;
    }

    if (!clubsLoading && !matchesLoading) {
      const selectedClub = clubs.find((c) => c.id === parseInt(clubId, 10));
      setClub(selectedClub || null);

      console.log(matches);

      const filteredMatches = matches.filter(
        (match) =>
          match.player1?.club_id === parseInt(clubId, 10) ||
          match.player2?.club_id === parseInt(clubId, 10)
      );

      filteredMatches.sort((a, b) => {
        const dateA = new Date(`${a.match_day}T${a.match_time}`);
        const dateB = new Date(`${b.match_day}T${b.match_time}`);
        return dateA - dateB;
      });

      setClubMatches(filteredMatches);
      setLoading(false);
    }
  }, [
    clubs,
    matches,
    clubsLoading,
    matchesLoading,
    clubId,
    clubsError,
    matchesError,
  ]);

  return { club, matches: clubMatches, loading, error };
};

export default useClubMatches;
