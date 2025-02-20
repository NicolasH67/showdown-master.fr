import React, { useState, useEffect } from "react";
import TournamentList from "../../Components/TournamentList/TournamentList";
import TournamentModal from "../../Components/TournamentModal/TournamentModal";
import { usePastTournaments } from "../../Hooks/usePastTournament";
import { useTranslation } from "react-i18next";

const Home = () => {
  const { tournaments, loading, error } = usePastTournaments();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [password, setPassword] = useState("");
  const [t, i18n] = useTranslation();

  const handleTournamentClick = (tournament) => {
    if (tournament.user_password) {
      setSelectedTournament(tournament);
      setIsModalOpen(true);
    } else {
      window.location.href = `/tournament/${tournament.id}/players`;
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === selectedTournament.user_password) {
      setIsModalOpen(false);
      window.location.href = `/tournament/${selectedTournament.id}/players`;
    } else {
      alert("Mot de passe incorrect");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setPassword("");
    setSelectedTournament(null);
  };

  if (loading) return <div>{t("loading")}</div>;
  if (error) return <div>{t("errorFetchingTournaments")}</div>;

  return (
    <div className="container mt-4">
      <h1 className="mb-4">{t("availableTournaments")}</h1>
      <TournamentList
        tournaments={tournaments}
        onTournamentClick={handleTournamentClick}
      />
      {isModalOpen && (
        <TournamentModal
          isOpen={isModalOpen}
          password={password}
          setPassword={setPassword}
          onSubmit={handlePasswordSubmit}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Home;
