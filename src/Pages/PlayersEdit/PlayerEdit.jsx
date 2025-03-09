import { useState } from "react";
import { useParams } from "react-router-dom";
import useTournamentData from "../../Hooks/useTournamentData";
import PlayerForm from "../../Components/PlayerForm/PlayerForm";
import RefereeForm from "../../Components/RefereeForm/RefereeForm";
import ClubForm from "../../Components/ClubForm/ClubForm";
import Button from "../../Components/Button/Button";
import { useTranslation } from "react-i18next";
import RefereeTable from "../../Components/RefereeTable/RefereeTable";
import PlayerTableEdit from "../../Components/PlayerTableEdit/PlayerTableEdit";
import supabase from "../../Helpers/supabaseClient";

const PlayersEdit = () => {
  const { id } = useParams();
  const {
    groups = [],
    clubs = [],
    players = [],
    referees = [],
    loading,
    error,
  } = useTournamentData(id);

  const [formType, setFormType] = useState("player");
  const [playersList, setPlayersList] = useState(players); // Ajout de l'état playersList
  const { t } = useTranslation();

  const groupType = "default";

  const onDelete = async (playerId) => {
    try {
      const { error } = await supabase
        .from("player")
        .delete()
        .eq("id", playerId);

      if (error) {
        console.error(
          "Erreur lors de la suppression du joueur :",
          error.message
        );
      } else {
        console.log("Joueur supprimé avec succès, ID :", playerId);
        setPlayersList((prevPlayers) =>
          prevPlayers.filter((player) => player.id !== playerId)
        );
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
    }
  };

  const onEdit = async (playerId, updatedData) => {
    console.log(playerId, updatedData);
    try {
      const { error } = await supabase
        .from("player")
        .update(updatedData)
        .eq("id", playerId);

      if (error) {
        console.error(
          "Erreur lors de la modification du joueur :",
          error.message
        );
      } else {
        console.log("Joueur modifié avec succès, ID :", playerId, updatedData);
        setPlayersList((prevPlayers) =>
          prevPlayers.map((player) =>
            player.id === playerId ? { ...player, ...updatedData } : player
          )
        );
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
    }
  };

  if (loading) return <p>{t("loading")}</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-center my-3">
        <Button
          label={t("createClubs")}
          onClick={() => setFormType("club")}
          active={formType === "club"}
        />
        <Button
          label={t("createPlayer")}
          onClick={() => setFormType("player")}
          active={formType === "player"}
        />
        <Button
          label={t("createReferee")}
          onClick={() => setFormType("referee")}
          active={formType === "referee"}
        />
      </div>

      {formType === "club" && <ClubForm tournamentId={id} />}
      {formType === "player" && (
        <PlayerForm tournamentId={id} clubs={clubs} groups={groups} />
      )}
      {formType === "referee" && (
        <RefereeForm tournamentId={id} clubs={clubs} />
      )}

      <div className="mt-4">
        {formType === "club" && (
          <div>
            <h3>{t("clubsList")}</h3>
            <ul>
              {clubs.map((club) => (
                <li key={club.id}>
                  {club.name} ({club.abbreviation})
                </li>
              ))}
            </ul>
          </div>
        )}

        {formType === "player" && (
          <div>
            <h3>{t("titlePlayersList")}</h3>
            <PlayerTableEdit
              clubs={clubs}
              players={players} // Passer playersList au lieu de players
              groupType={groupType}
              groups={groups}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          </div>
        )}

        {formType === "referee" && (
          <div>
            <RefereeTable referees={referees} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayersEdit;
