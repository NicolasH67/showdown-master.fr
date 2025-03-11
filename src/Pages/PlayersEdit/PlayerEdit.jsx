import { useState } from "react";
import { useParams } from "react-router-dom";
import useTournamentData from "../../Hooks/useTournamentData";
import PlayerForm from "../../Components/PlayerForm/PlayerForm";
import RefereeForm from "../../Components/RefereeForm/RefereeForm";
import ClubForm from "../../Components/ClubForm/ClubForm";
import Button from "../../Components/Button/Button";
import { useTranslation } from "react-i18next";
import PlayerTableEdit from "../../Components/PlayerTableEdit/PlayerTableEdit";
import ClubsTableEdit from "../../Components/ClubsTableEdit/ClubsTableEdit";
import RefereeTableEdit from "../../Components/RefereeTableEdit/RefereeTableEdit";
import useEntityActions from "../../Hooks/useEntityActions";

const PlayersEdit = () => {
  const { id } = useParams();

  const [refreshTrigger, setRefreshTrigger] = useState(false);

  const {
    groups,
    clubs,
    players,
    referees,
    loading,
    error: tournamentError,
  } = useTournamentData(id, refreshTrigger);

  const [formType, setFormType] = useState("player");
  const { t } = useTranslation();
  const { onDelete, onEdit, error, successMessage } = useEntityActions();

  const groupType = "default";

  if (loading) return <p>{t("loading")}</p>;
  if (tournamentError) return <p>{tournamentError}</p>; // Affiche l'erreur du tournoi

  const handleDelete = async (entity, entityId) => {
    await onDelete(entity, entityId);
    setRefreshTrigger((prev) => !prev); // Force un re-render
  };

  const handleEdit = async (entity, entityId, updatedData) => {
    await onEdit(entity, entityId, updatedData);
    setRefreshTrigger((prev) => !prev); // Force un re-render
  };

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

      {formType === "club" && (
        <ClubForm
          tournamentId={id}
          onAddSuccess={() => setRefreshTrigger((prev) => !prev)}
        />
      )}
      {formType === "player" && (
        <PlayerForm
          tournamentId={id}
          clubs={clubs}
          groups={groups}
          onAddSuccess={() => setRefreshTrigger((prev) => !prev)}
        />
      )}
      {formType === "referee" && (
        <RefereeForm
          tournamentId={id}
          clubs={clubs}
          onAddSuccess={() => setRefreshTrigger((prev) => !prev)}
        />
      )}

      <div className="mt-4">
        {formType === "club" && (
          <div>
            <h3>{t("clubsList")}</h3>
            <ClubsTableEdit
              clubs={clubs}
              onDelete={(clubId) => handleDelete("club", clubId)}
              onEdit={(clubId, updatedData) =>
                handleEdit("club", clubId, updatedData)
              }
            />
          </div>
        )}

        {formType === "player" && (
          <div>
            <h3>{t("titlePlayersList")}</h3>
            <PlayerTableEdit
              clubs={clubs}
              players={players}
              groupType={groupType}
              groups={groups}
              onDelete={(playerId) => handleDelete("player", playerId)}
              onEdit={(playerId, updatedData) =>
                handleEdit("player", playerId, updatedData)
              }
            />
          </div>
        )}

        {formType === "referee" && (
          <div>
            <RefereeTableEdit
              referees={referees}
              onDelete={(refereeId) => handleDelete("referee", refereeId)}
              onEdit={(refereeId, updatedData) =>
                handleEdit("referee", refereeId, updatedData)
              }
              clubs={clubs}
            />
          </div>
        )}
      </div>

      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
    </div>
  );
};

export default PlayersEdit;
