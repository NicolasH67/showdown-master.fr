import React from "react";
import { useTranslation } from "react-i18next";
import supabase from "../../Helpers/supabaseClient";
import { useParams } from "react-router-dom";

const TournamentForm = ({
  tournamentData,
  handleChange,
  handleSubmit,
  loading,
  error,
  successMessage,
}) => {
  const { t } = useTranslation();

  const { id } = useParams();

  const deleteTournament = async (e) => {
    e.preventDefault();
    const confirmation = window.prompt(t("confirmDeleteTournamentPrompt"));
    if (confirmation === "DELETE") {
      const { error } = await supabase.from("tournament").delete().eq("id", id);
      if (error) {
        console.error(error.message);
      } else {
        console.log("Le tournoi a été supprimé");
        window.location.href = "/";
      }
    } else {
      return;
    }
  };

  return (
    <div className="container mt-5">
      <h1 id="page-title" tabIndex="-1">
        {t("tournamentManagement")}
      </h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">{t("titleNameTournament")}</label>
          <input
            type="text"
            name="title"
            value={tournamentData.title || ""}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("titleStartDay")}</label>
          <input
            type="date"
            name="startday"
            value={tournamentData.startday || ""}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("titleEndDay")}</label>
          <input
            type="date"
            name="endday"
            value={tournamentData.endday || ""}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            name="email"
            value={tournamentData.email || ""}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("passwordAdmin")}</label>
          <input
            type="text"
            name="admin_password"
            value={tournamentData.admin_password || ""}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("passwordUser")}</label>
          <input
            type="text"
            name="user_password"
            value={tournamentData.user_password || ""}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("passwordReferee")}</label>
          <input
            type="text"
            name="ereferee_password"
            value={tournamentData.ereferee_password || ""}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("numberOfTable")}</label>
          <input
            type="number"
            name="table_count"
            value={tournamentData.table_count || ""}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("matchDuration")}</label>
          <input
            type="number"
            name="match_duration"
            value={tournamentData.match_duration || ""}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("location")}</label>
          <input
            type="text"
            name="location"
            value={tournamentData.location || ""}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-100"
        >
          {t("saveChanges")}
        </button>
        <br />
        <button
          onClick={deleteTournament}
          disabled={loading}
          className="btn btn-danger mt-3 w-100"
        >
          {t("delete")}
        </button>
      </form>
    </div>
  );
};

export default TournamentForm;
