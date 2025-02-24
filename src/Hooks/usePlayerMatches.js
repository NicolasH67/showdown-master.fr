import { useState, useEffect } from "react";
import usePlayers from "./usePlayers";
import useMatches from "./useMatchs";

/**
 * Hook to fetch a player's details along with their matches.
 *
 * @param {string} playerId - The ID of the player.
 * @param {string} tournamentId - The ID of the tournament to filter matches.
 * @returns {Object}
 * - player: The player's details.
 * - matches: The list of matches involving the player, sorted by date and time.
 * - loading: A boolean indicating if data is still being fetched.
 * - error: An error object if an error occurred during fetching.
 */
const usePlayerMatches = (playerId, tournamentId) => {
  const {
    players,
    loading: playersLoading,
    error: playersError,
  } = usePlayers(tournamentId);
  const {
    matches,
    loading: matchesLoading,
    error: matchesError,
  } = useMatches();

  const [player, setPlayer] = useState(null);
  const [playerMatches, setPlayerMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (playersError || matchesError) {
      setError(playersError || matchesError);
      setLoading(false);
      return;
    }

    if (!playersLoading && !matchesLoading) {
      // Trouver le joueur correspondant à l'ID
      const selectedPlayer = players.find(
        (p) => p.id === parseInt(playerId, 10)
      );
      setPlayer(selectedPlayer || null);

      // Filtrer les matchs où le joueur est impliqué
      const filteredMatches = matches.filter(
        (match) =>
          match.player1.id === parseInt(playerId, 10) ||
          match.player2.id === parseInt(playerId, 10)
      );

      // Trier les matchs par date et heure
      filteredMatches.sort((a, b) => {
        const dateA = new Date(`${a.match_date}T${a.match_time}`);
        const dateB = new Date(`${b.match_date}T${b.match_time}`);
        return dateA - dateB;
      });

      setPlayerMatches(filteredMatches);
      setLoading(false);
    }
  }, [
    players,
    matches,
    playersLoading,
    matchesLoading,
    playerId,
    playersError,
    matchesError,
  ]);

  return { player, matches: playerMatches, loading, error };
};

export default usePlayerMatches;
