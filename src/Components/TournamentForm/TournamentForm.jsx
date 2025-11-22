import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import supabase from "../../Helpers/supabaseClient";
import { useParams, useLocation } from "react-router-dom";

const TournamentForm = ({
  tournamentData,
  handleChange,
  handleSubmit,
  loading,
  error,
  successMessage,
}) => {
  const { t } = useTranslation();

  const location = useLocation();

  const { id } = useParams();

  const [passwordModal, setPasswordModal] = useState({
    open: false,
    field: null, // "admin_password" | "user_password" | "ereferee_password"
  });

  const [pwdForm, setPwdForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const openPasswordModal = (field) => {
    setPasswordModal({ open: true, field });
    setPwdForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
    setPwdError("");
  };

  const closePasswordModal = () => {
    setPasswordModal({ open: false, field: null });
    setPwdError("");
  };

  const handlePasswordFieldChange = (e) => {
    const { name, value } = e.target;
    setPwdForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordModal.field) return;

    setPwdError("");
    const isAdmin = passwordModal.field === "admin_password";

    // Vérif de confirmation en front (pour user/ereferee, newPassword peut être vide)
    if (pwdForm.newPassword !== pwdForm.confirmNewPassword) {
      setPwdError(
        t("passwordsDoNotMatch", {
          defaultValue: "Les mots de passe ne correspondent pas.",
        })
      );
      return;
    }

    // Pour l'admin, le nouveau mot de passe est obligatoire
    if (isAdmin && !pwdForm.newPassword) {
      setPwdError(
        t("newPasswordRequiredForAdmin", {
          defaultValue: "Un nouveau mot de passe admin est obligatoire.",
        })
      );
      return;
    }

    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      setPwdError(
        t("invalidTournamentId", {
          defaultValue: "Identifiant de tournoi invalide.",
        })
      );
      return;
    }

    const type =
      passwordModal.field === "admin_password"
        ? "admin"
        : passwordModal.field === "user_password"
        ? "user"
        : "ereferee";

    setPwdLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${idNum}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          oldPassword: pwdForm.oldPassword || "",
          newPassword: pwdForm.newPassword || "",
        }),
      });

      if (!res.ok) {
        let message =
          t("errorUpdatingPassword", {
            defaultValue: "Erreur lors de la mise à jour du mot de passe.",
          }) || "Erreur lors de la mise à jour du mot de passe.";
        try {
          const errJson = await res.json();
          const code = errJson?.error;
          if (code === "old_password_required") {
            message =
              t("oldPasswordRequired", {
                defaultValue: "L'ancien mot de passe est obligatoire.",
              }) || message;
          } else if (code === "old_password_invalid") {
            message =
              t("oldPasswordInvalid", {
                defaultValue: "L'ancien mot de passe est incorrect.",
              }) || message;
          } else if (code === "new_password_required_for_admin") {
            message =
              t("newPasswordRequiredForAdmin", {
                defaultValue: "Un nouveau mot de passe admin est obligatoire.",
              }) || message;
          } else if (code === "unauthorized") {
            message =
              t("unauthorized", {
                defaultValue: "Accès non autorisé.",
              }) || message;
          }
        } catch (_) {
          // ignore json parse errors
        }
        setPwdError(message);
        return;
      }

      // Succès : on marque localement qu'un mot de passe existe (ou a été vidé)
      const newValue = pwdForm.newPassword ? "********" : "";
      handleChange({
        target: {
          name: passwordModal.field,
          value: newValue,
          type: "text",
        },
      });

      closePasswordModal();
    } catch (err) {
      console.error("[TournamentForm] handlePasswordSubmit error:", err);
      setPwdError(
        t("errorUpdatingPassword", {
          defaultValue: "Erreur lors de la mise à jour du mot de passe.",
        }) || "Erreur lors de la mise à jour du mot de passe."
      );
    } finally {
      setPwdLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const title = document.getElementById("page-title");
      if (title && document.body.contains(title)) {
        title.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

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
          <label className="form-label">{t("titlestartDay")}</label>
          <input
            type="date"
            name="startDay"
            value={
              tournamentData.startDay
                ? tournamentData.startDay.includes("/")
                  ? // cas JJ/MM/AAAA -> on convertit en AAAA-MM-JJ
                    tournamentData.startDay.split("/").reverse().join("-")
                  : // cas déjà AAAA-MM-JJ ou ISO -> on tronque à 10 caractères
                    tournamentData.startDay.slice(0, 10)
                : ""
            }
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{t("titleendDay")}</label>
          <input
            type="date"
            name="endDay"
            value={
              tournamentData.endDay
                ? tournamentData.endDay.includes("/")
                  ? // cas JJ/MM/AAAA -> on convertit en AAAA-MM-JJ
                    tournamentData.endDay.split("/").reverse().join("-")
                  : // cas déjà AAAA-MM-JJ ou ISO -> on tronque à 10 caractères
                    tournamentData.endDay.slice(0, 10)
                : ""
            }
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
          <div className="d-flex gap-2">
            <input
              type="password"
              className="form-control"
              value={tournamentData.admin_password ? "********" : ""}
              readOnly
              disabled
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => openPasswordModal("admin_password")}
            >
              {t("changePassword", {
                defaultValue: "Changer le mot de passe",
              })}
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">{t("passwordUser")}</label>
          <div className="d-flex gap-2">
            <input
              type="password"
              className="form-control"
              value={tournamentData.user_password ? "********" : ""}
              readOnly
              disabled
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => openPasswordModal("user_password")}
            >
              {t("changePassword", {
                defaultValue: "Changer le mot de passe",
              })}
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">{t("passwordReferee")}</label>
          <div className="d-flex gap-2">
            <input
              type="password"
              className="form-control"
              value={tournamentData.ereferee_password ? "********" : ""}
              readOnly
              disabled
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => openPasswordModal("ereferee_password")}
            >
              {t("changePassword", {
                defaultValue: "Changer le mot de passe",
              })}
            </button>
          </div>
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

        {passwordModal.open && (
          <>
            <div className="modal-backdrop fade show" />
            <div
              className="modal fade show"
              tabIndex="-1"
              role="dialog"
              style={{ display: "block" }}
            >
              <div className="modal-dialog" role="document">
                <div className="modal-content">
                  <div>
                    <div className="modal-header">
                      <h5 className="modal-title">
                        {t("changePassword", {
                          defaultValue: "Changer le mot de passe",
                        })}
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        aria-label={t("close", { defaultValue: "Fermer" })}
                        onClick={closePasswordModal}
                      />
                    </div>
                    <div className="modal-body">
                      {pwdError && (
                        <div className="alert alert-danger">{pwdError}</div>
                      )}
                      <div className="mb-3">
                        <label className="form-label">
                          {t("oldPassword", {
                            defaultValue: "Ancien mot de passe",
                          })}
                        </label>
                        <input
                          type="password"
                          name="oldPassword"
                          value={pwdForm.oldPassword}
                          onChange={handlePasswordFieldChange}
                          className="form-control"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">
                          {t("newPassword", {
                            defaultValue: "Nouveau mot de passe",
                          })}
                          {passwordModal.field === "admin_password" && " *"}
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={pwdForm.newPassword}
                          onChange={handlePasswordFieldChange}
                          className="form-control"
                        />
                        {passwordModal.field === "admin_password" && (
                          <small className="form-text text-muted">
                            {t("newAdminPasswordRequired", {
                              defaultValue:
                                "Le nouveau mot de passe admin est obligatoire.",
                            })}
                          </small>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="form-label">
                          {t("confirmNewPassword", {
                            defaultValue: "Confirmer le nouveau mot de passe",
                          })}
                        </label>
                        <input
                          type="password"
                          name="confirmNewPassword"
                          value={pwdForm.confirmNewPassword}
                          onChange={handlePasswordFieldChange}
                          className="form-control"
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={closePasswordModal}
                        disabled={pwdLoading}
                      >
                        {t("cancel", { defaultValue: "Annuler" })}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={pwdLoading}
                        onClick={handlePasswordSubmit}
                      >
                        {pwdLoading
                          ? t("saving", { defaultValue: "Enregistrement..." })
                          : t("save", { defaultValue: "Enregistrer" })}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

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
