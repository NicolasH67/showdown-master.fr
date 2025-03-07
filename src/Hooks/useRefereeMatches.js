import { useState, useEffect } from "react";
import useReferee from "./useReferee";
import useMatches from "./useMatchs";

/**
 * Hook to fetch a referee's details along with the matches they officiated.
 *
 * @param {string} refereeId - The ID of the referee.
 * @param {string} tournamentId - The ID of the tournament to filter referees.
 * @returns {Object}
 * - referee: The referee's details.
 * - matches: The list of matches officiated by the referee, sorted by date and time.
 * - loading: A boolean indicating if data is still being fetched.
 * - error: An error object if an error occurred during fetching.
 */
const useRefereeMatches = (refereeId, tournamentId) => {
  const {
    referees,
    loading: refereesLoading,
    error: refereesError,
  } = useReferee(tournamentId);
  const {
    matches,
    loading: matchesLoading,
    error: matchesError,
  } = useMatches();

  const [referee, setReferee] = useState(null);
  const [refereeMatches, setRefereeMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (refereesError || matchesError) {
      setError(refereesError || matchesError);
      setLoading(false);
      return;
    }

    if (!refereesLoading && !matchesLoading) {
      // Trouver l'arbitre correspondant à l'ID
      const selectedReferee = referees.find(
        (r) => r.id === parseInt(refereeId, 10)
      );
      setReferee(selectedReferee || null);

      const filteredMatches = matches.filter(
        (match) =>
          (match.referee_1 && match.referee_1.id === parseInt(refereeId, 10)) ||
          (match.referee_2 && match.referee_2.id === parseInt(refereeId, 10))
      );

      // Trier les matchs par date et heure
      filteredMatches.sort((a, b) => {
        const dateA = new Date(`${a.match_day}T${a.match_time}`);
        const dateB = new Date(`${b.match_day}T${b.match_time}`);
        return dateA - dateB;
      });

      setRefereeMatches(filteredMatches);
      setLoading(false);
    }
  }, [
    referees,
    matches,
    refereesLoading,
    matchesLoading,
    refereeId,
    refereesError,
    matchesError,
  ]);

  return { referee, matches: refereeMatches, loading, error };
};

export default useRefereeMatches;
