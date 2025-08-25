import React from "react";
import { useTranslation } from "react-i18next";

/**
 * TournamentModal Component
 *
 * This component displays a modal that prompts the user to enter a password.
 * It is typically used for accessing or managing a tournament.
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Controls the visibility of the modal
 * @param {string} props.password - Current password input value
 * @param {Function} props.setPassword - Function to update the password state
 * @param {Function} props.onSubmit - Function called when the form is submitted
 * @param {Function} props.onClose - Function called when the modal is closed
 * @param {string} [props.errorMessage] - Message indicating validation result (error or success)
 *
 * @returns {JSX.Element|null} The rendered modal component or null if `isOpen` is false
 */
const TournamentModal = ({
  isOpen,
  password,
  setPassword,
  onSubmit,
  onClose,
  errorMessage,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="modal show fade"
      style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.5)" }} // Fond gris
      role="dialog"
      aria-labelledby="modal-title"
      aria-hidden={!isOpen}
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modal-title">
              {t("titlePassword")}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <input
                  type="password"
                  className="form-control"
                  placeholder={t("password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  aria-label={t("password")}
                  aria-describedby={
                    errorMessage ? "password-feedback" : undefined
                  }
                />
                {errorMessage && (
                  <div
                    id="password-feedback"
                    role="alert"
                    aria-live="assertive"
                    className={
                      errorMessage.includes("correct")
                        ? "text-success mt-2"
                        : "text-danger mt-2"
                    }
                  >
                    {errorMessage}
                  </div>
                )}
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              data-bs-dismiss="modal"
              onClick={onClose}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              onClick={onSubmit}
            >
              {t("submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentModal;
