import React from "react";
import useTournamentForm from "../../Hooks/useTournamentForm";
import InputField from "../../Components/InputField/InputField";

const CreateTournament = () => {
  const { formData, handleChange, handleSubmit, error, loading } =
    useTournamentForm();

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Créer un nouveau tournoi</h1>
      <form onSubmit={handleSubmit}>
        <InputField
          label="Nom du tournoi"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
        />
        <InputField
          label="Date de début"
          type="date"
          name="startday"
          value={formData.startday}
          onChange={handleChange}
        />
        <InputField
          label="Date de fin"
          type="date"
          name="endday"
          value={formData.endday}
          onChange={handleChange}
        />
        <InputField
          label="Mot de passe"
          type="password"
          name="adminPassword"
          value={formData.adminPassword}
          onChange={handleChange}
        />
        <InputField
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />

        {error && <p className="text-danger">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Création en cours..." : "Créer le tournoi"}
        </button>
      </form>
    </div>
  );
};

export default CreateTournament;
