import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const { onDelete, onEdit, error, successMessage } = useEntityActions();

  const groupType = "default";

  console.log(groups);

  const firstRoundGroups = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.filter((g) => g.round_type === "1st round");
  }, [groups]);

  console.log(firstRoundGroups);

  useEffect(() => {
    if (players.length > 0 || clubs.length > 0 || referees.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, players.length, clubs.length, referees.length]);

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
      <h1 id="page-title" tabIndex="-1">
        {t("editParticipants")}
      </h1>
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
          groups={firstRoundGroups}
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
              groups={firstRoundGroups}
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
