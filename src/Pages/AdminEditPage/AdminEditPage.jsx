// src/pages/AdminEditPage.js
import React from "react";
import { useParams } from "react-router-dom";
import useAdminTournament from "../../Hooks/useAdminTournament";
import TournamentForm from "../../Components/TournamentForm/TournamentForm";

const AdminEditPage = () => {
  const { id } = useParams();
  const {
    tournamentData,
    loading,
    error,
    successMessage,
    handleChange,
    handleSubmit,
  } = useAdminTournament(id);

  console.log("tournament edit data", tournamentData);

  return (
    <TournamentForm
      tournamentData={tournamentData}
      loading={loading}
      error={error}
      successMessage={successMessage}
      handleChange={handleChange}
      handleSubmit={handleSubmit}
    />
  );
};

export default AdminEditPage;
