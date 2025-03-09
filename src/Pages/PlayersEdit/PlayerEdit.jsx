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
import ClubsTableEdit from "../../Components/ClubsTableEdit/ClubsTableEdit";
import RefereeTableEdit from "../../Components/RefereeTableEdit/RefereeTableEdit";

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
  const [playersList, setPlayersList] = useState(players); // Correct state usage
  const { t } = useTranslation();

  const groupType = "default";

  const onDeleteReferee = async (refereeId) => {
    try {
      const { error } = await supabase
        .from("referee")
        .delete()
        .eq("id", refereeId);

      if (error) {
        console.error(
          "Erreur lors de la suppression de l'arbitre :",
          error.message
        );
      } else {
        console.log("Arbitre supprimé avec succès, ID :", refereeId);
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
    }
  };

  const onEditReferee = async (refereeId, updatedData) => {
    console.log(refereeId, updatedData);
    try {
      const { error } = await supabase
        .from("referee")
        .update(updatedData)
        .eq("id", refereeId);

      if (error) {
        console.error(
          "Erreur lors de la modification de l'arbitre :",
          error.message
        );
      } else {
        console.log(
          "Arbitre modifié avec succès, ID :",
          refereeId,
          updatedData
        );
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
    }
  };

  const onDeletePlayer = async (playerId) => {
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

  const onEditPlayer = async (playerId, updatedData) => {
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

  const onDeleteClub = async (clubId) => {
    try {
      const { error } = await supabase.from("club").delete().eq("id", clubId);

      if (error) {
        console.error("Erreur lors de la suppression du club :", error.message);
      } else {
        console.log("Club supprimé avec succès, ID :", clubId);
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
    }
  };

  const onEditClub = async (clubId, updatedData) => {
    console.log(clubId, updatedData);
    try {
      const { error } = await supabase
        .from("club")
        .update(updatedData)
        .eq("id", clubId);

      if (error) {
        console.error(
          "Erreur lors de la modification du club :",
          error.message
        );
      } else {
        console.log("Club modifié avec succès, ID :", clubId, updatedData);
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
            <ClubsTableEdit
              clubs={clubs}
              onDelete={onDeleteClub}
              onEdit={onEditClub}
            />
          </div>
        )}

        {formType === "player" && (
          <div>
            <h3>{t("titlePlayersList")}</h3>
            <PlayerTableEdit
              clubs={clubs}
              players={players} // Corrected state usage here
              groupType={groupType}
              groups={groups}
              onDelete={onDeletePlayer}
              onEdit={onEditPlayer}
            />
          </div>
        )}

        {formType === "referee" && (
          <div>
            <RefereeTableEdit
              referees={referees}
              onDelete={onDeleteReferee}
              onEdit={onEditReferee}
              clubs={clubs}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayersEdit;
