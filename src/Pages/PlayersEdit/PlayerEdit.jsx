import { useState } from "react";
import { useParams } from "react-router-dom";
import useTournamentData from "../../Hooks/useTournamentData";
import PlayerForm from "../../Components/PlayerForm/PlayerForm";
import RefereeForm from "../../Components/RefereeForm/RefereeForm";
import ClubForm from "../../Components/ClubForm/ClubForm";
import Button from "../../Components/Button/Button";
import { useTranslation } from "react-i18next";

const PlayersEdit = () => {
  const { id } = useParams();
  const { divisions, clubs, loading, error } = useTournamentData(id);
  const [formType, setFormType] = useState("player");
  const { t } = useTranslation();

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
        <PlayerForm tournamentId={id} clubs={clubs} divisions={divisions} />
      )}
      {formType === "referee" && (
        <RefereeForm tournamentId={id} clubs={clubs} />
      )}
    </div>
  );
};

export default PlayersEdit;
