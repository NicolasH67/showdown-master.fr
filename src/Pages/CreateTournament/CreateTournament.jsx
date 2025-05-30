import React from "react";
import useTournamentForm from "../../Hooks/useTournamentForm";
import InputField from "../../Components/InputField/InputField";
import { useTranslation } from "react-i18next";

/**
 * CreateTournament component - A form for creating a new tournament.
 *
 * This component utilizes a custom hook `useTournamentForm` to handle form state and submission.
 * It also uses `react-i18next` for internationalization support.
 *
 * @component
 * @example
 * return (
 *   <CreateTournament />
 * )
 */
const CreateTournament = () => {
  const { formData, handleChange, handleSubmit, error, loading } =
    useTournamentForm();
  const { t, i18n } = useTranslation();

  return (
    <div className="container mt-5">
      <h1 className="mb-4" autoFocus>
        {t("createNewTournament")}
      </h1>
      <form onSubmit={handleSubmit}>
        <InputField
          label={t("titleNameTournament")}
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
        />
        <InputField
          label={t("titleStartDay")}
          type="date"
          name="startday"
          value={formData.startday}
          onChange={handleChange}
        />
        <InputField
          label={t("titleEndDay")}
          type="date"
          name="endday"
          value={formData.endday}
          onChange={handleChange}
        />
        <InputField
          label={t("password")}
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
          {loading ? t("creating") : t("createTournamentButton")}
        </button>
      </form>
    </div>
  );
};

export default CreateTournament;
