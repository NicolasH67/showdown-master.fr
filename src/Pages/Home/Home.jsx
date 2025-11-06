import React, { useState, useEffect } from "react";
import TournamentList from "../../Components/TournamentList/TournamentList";
import TournamentModal from "../../Components/TournamentModal/TournamentModal";
import { useTournaments } from "../../Hooks/useTournament";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { post } from "../../Helpers/apiClient";

/**
 * Home component that displays upcoming tournaments and handles password protection.
 *
 * @component
 * @example
 * return (
 *   <Home />
 * )
 */
const Home = () => {
  const { tournaments, loading, error } = useTournaments(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [password, setPassword] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [t, i18n] = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, loading]);

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
  };

  /**
   * Executes handleLogout on page load.
   */
  useEffect(() => {
    handleLogout();
  }, []);

  /**
   * Handles tournament click to either show password modal or navigate directly.
   *
   * @param {Object} tournament - The selected tournament object.
   */
  const handleTournamentClick = (tournament) => {
    if (tournament.is_private === true) {
      setSelectedTournament(tournament);
      setModalMessage("");
      setIsModalOpen(true);
    } else {
      navigate(`/tournament/${tournament.id}/players`);
    }
  };

  /**
   * Handles password form submission, verifying the entered password.
   *
   * @param {Event} e - The form submit event.
   */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await post("/api/auth/login", {
        tournamentId: selectedTournament.id,
        password,
      });
      setModalMessage(
        t("passwordCorrect", { defaultValue: "Mot de passe correct." })
      );
      setIsModalOpen(false);
      navigate(`/tournament/${selectedTournament.id}/players`);
    } catch (err) {
      setModalMessage(
        t("wrongPassword", { defaultValue: "Mot de passe incorrect." })
      );
    }
  };

  /**
   * Closes the password modal and resets state.
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setPassword("");
    setModalMessage("");
    setSelectedTournament(null);
  };

  if (loading) return <div>{t("loading")}</div>;
  if (error) return <div>{t("errorFetchingTournaments")}</div>;

  console.log(tournaments);

  return (
    <div className="container mt-4">
      <h1 id="page-title" tabIndex="-1" className="mb-4">
        {t("availableTournaments")}
      </h1>
      <TournamentList
        tournaments={tournaments}
        onTournamentClick={handleTournamentClick}
      />
      {isModalOpen && (
        <TournamentModal
          isOpen={isModalOpen}
          password={password}
          setPassword={(val) => {
            setPassword(val);
            setModalMessage("");
          }}
          onSubmit={handlePasswordSubmit}
          onClose={handleModalClose}
          errorMessage={modalMessage}
        />
      )}
    </div>
  );
};

export default Home;
