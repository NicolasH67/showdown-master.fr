import { useGroupsData } from "../Hooks/useGroupsData";
import { useClub } from "../Hooks/useClub";
import { usePlayers } from "../Hooks/usePlayers";
import { useReferee } from "../Hooks/useReferee";

const useTournamentData = (tournamentId, refreshTrigger) => {
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
  } = useGroupsData(tournamentId, refreshTrigger);
  const {
    clubs,
    loading: clubsLoading,
    error: clubsError,
  } = useClub(tournamentId, refreshTrigger);
  const {
    players,
    loading: playersLoading,
    error: playersError,
  } = usePlayers(tournamentId, refreshTrigger);
  const {
    referees,
    loading: refereesLoading,
    error: refereesError,
  } = useReferee(tournamentId, refreshTrigger);

  return {
    groups,
    groupsLoading,
    groupsError,
    clubs,
    clubsLoading,
    clubsError,
    players,
    playersLoading,
    playersError,
    referees,
    refereesLoading,
    refereesError,
  };
};

export default useTournamentData;
