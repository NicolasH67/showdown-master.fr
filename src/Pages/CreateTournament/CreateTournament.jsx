import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();

  const [fieldErrors, setFieldErrors] = React.useState({
    title: "",
    startday: "",
    endday: "",
    adminPassword: "",
    email: "",
  });

  // Email verification (SMTP endpoints)
  const [emailCodeSent, setEmailCodeSent] = React.useState(false);
  const [emailSending, setEmailSending] = React.useState(false);
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [userEmailCode, setUserEmailCode] = React.useState("");
  const [emailCodeError, setEmailCodeError] = React.useState("");
  const [emailCodeInfo, setEmailCodeInfo] = React.useState("");
  const [requestId, setRequestId] = React.useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // min 8, 1 lettre, 1 chiffre

  const validateField = (name, value, draft) => {
    let msg = "";
    const data = { ...formData, ...draft, [name]: value };
    switch (name) {
      case "title":
        if (!value?.trim()) msg = t("validation_required");
        else if (value.length > 50) msg = t("validation_max");
        break;
      case "startday":
        if (!value) msg = t("validation_required");
        else if (data.endday && value > data.endday)
          msg = t("validation_start_before_end");
        break;
      case "endday":
        if (!value) msg = t("validation_required");
        else if (data.startday && value < data.startday)
          msg = t("validation_end_after_start");
        break;
      case "adminPassword":
        if (!value) msg = t("validation_required");
        else if (!passwordRegex.test(value))
          msg = t("validation_password_rules");
        break;
      case "email":
        if (!value) msg = t("validation_required");
        else if (!emailRegex.test(value)) msg = t("validation_email");
        break;
      default:
        break;
    }
    return msg;
  };

  const validateAll = (draft = {}) => {
    const next = { ...fieldErrors };
    next.title = validateField("title", draft.title ?? formData.title, draft);
    next.startday = validateField(
      "startday",
      draft.startday ?? formData.startday,
      draft
    );
    next.endday = validateField(
      "endday",
      draft.endday ?? formData.endday,
      draft
    );
    next.adminPassword = validateField(
      "adminPassword",
      draft.adminPassword ?? formData.adminPassword,
      draft
    );
    next.email = validateField("email", draft.email ?? formData.email, draft);
    setFieldErrors(next);
    return next;
  };

  const handleSendEmailCode = async () => {
    setEmailCodeError("");
    setEmailCodeInfo("");
    setEmailVerified(false);

    // Validate email first
    const msg = validateField("email", formData.email, {
      email: formData.email,
    });
    setFieldErrors((prev) => ({ ...prev, email: msg }));
    if (msg) return;

    setEmailSending(true);
    try {
      const res = await fetch(`/api/send-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      if (res.status === 404) throw new Error("endpoint_not_found");
      if (!res.ok) throw new Error("send_failed");
      const data = await res.json();
      setRequestId(data.requestId || "");
      setEmailCodeSent(true);
      setEmailCodeInfo(
        t("email_code_sent", {
          defaultValue: "Un code vient d'être envoyé à votre adresse email.",
        })
      );
    } catch (e) {
      if (e?.message === "endpoint_not_found") {
        setEmailCodeError(
          t("email_endpoint_missing", {
            defaultValue:
              "Endpoint /api/send-email-code introuvable. Vérifiez votre serveur SMTP et la variable VITE_API_BASE.",
          })
        );
      } else {
        setEmailCodeError(
          t("email_code_send_failed", {
            defaultValue: "L'envoi du code a échoué. Réessayez.",
          })
        );
      }
    } finally {
      setEmailSending(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    setEmailCodeError("");
    const code = (userEmailCode || "").trim();
    if (!code) {
      setEmailCodeError(
        t("validation_required", { defaultValue: "Champ requis." })
      );
      return;
    }

    try {
      const res = await fetch(`/api/verify-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, code }),
      });
      if (res.status === 404) throw new Error("endpoint_not_found");
      if (!res.ok) throw new Error("verify_failed");
      const data = await res.json();
      if (data.verified) {
        setEmailVerified(true);
        setEmailCodeInfo(
          t("email_verified", { defaultValue: "Adresse email vérifiée." })
        );
      } else {
        setEmailVerified(false);
        setEmailCodeError(
          t("email_code_invalid", { defaultValue: "Code invalide." })
        );
      }
    } catch (e) {
      if (e?.message === "endpoint_not_found") {
        setEmailVerified(false);
        setEmailCodeError(
          t("email_endpoint_missing_verify", {
            defaultValue:
              "Endpoint /api/verify-email-code introuvable. Vérifiez votre serveur SMTP et la variable VITE_API_BASE.",
          })
        );
      } else {
        setEmailVerified(false);
        setEmailCodeError(
          t("email_code_invalid", { defaultValue: "Code invalide." })
        );
      }
    }
  };

  const hasErrors = Object.values(fieldErrors).some(Boolean);

  useEffect(() => {
    const title = document.getElementById("page-title");
    if (title) {
      title.focus();
    }
  }, [location.pathname]);

  useEffect(() => {
    validateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mt-5">
      <h1 className="mb-4" id="page-title" tabIndex="-1">
        {t("createNewTournament")}
      </h1>
      <form
        onSubmit={(e) => {
          const errs = validateAll();
          const any = Object.values(errs).some(Boolean);
          if (any) {
            e.preventDefault();
            // déplace le focus sur le premier message d'erreur pour accessibilité
            const firstErrorKey = Object.keys(errs).find((k) => errs[k]);
            if (firstErrorKey) {
              const el = document.getElementById(`${firstErrorKey}-error`);
              if (el) el.focus();
            }
            return;
          }
          handleSubmit(e);
        }}
      >
        <InputField
          label={t("titleNameTournament")}
          type="text"
          name="title"
          value={formData.title}
          onChange={(e) => {
            handleChange(e);
            const msg = validateField("title", e.target.value, {
              title: e.target.value,
            });
            setFieldErrors((prev) => ({ ...prev, title: msg }));
          }}
        />
        {fieldErrors.title && (
          <div
            id="title-error"
            role="alert"
            aria-live="assertive"
            tabIndex="-1"
            className="text-danger mt-1"
          >
            {fieldErrors.title}
          </div>
        )}
        <InputField
          label={t("titleStartDay")}
          type="date"
          name="startday"
          value={formData.startday}
          onChange={(e) => {
            handleChange(e);
            const msg = validateField("startday", e.target.value, {
              startday: e.target.value,
            });
            setFieldErrors((prev) => ({ ...prev, startday: msg }));
          }}
        />
        {fieldErrors.startday && (
          <div
            id="startday-error"
            role="alert"
            aria-live="assertive"
            tabIndex="-1"
            className="text-danger mt-1"
          >
            {fieldErrors.startday}
          </div>
        )}
        <InputField
          label={t("titleEndDay")}
          type="date"
          name="endday"
          value={formData.endday}
          onChange={(e) => {
            handleChange(e);
            const msg = validateField("endday", e.target.value, {
              endday: e.target.value,
            });
            setFieldErrors((prev) => ({ ...prev, endday: msg }));
          }}
        />
        {fieldErrors.endday && (
          <div
            id="endday-error"
            role="alert"
            aria-live="assertive"
            tabIndex="-1"
            className="text-danger mt-1"
          >
            {fieldErrors.endday}
          </div>
        )}
        <InputField
          label={t("password")}
          type="password"
          name="adminPassword"
          value={formData.adminPassword}
          required
          aria-required="true"
          onChange={(e) => {
            handleChange(e);
            const msg = validateField("adminPassword", e.target.value, {
              adminPassword: e.target.value,
            });
            setFieldErrors((prev) => ({ ...prev, adminPassword: msg }));
          }}
        />
        {fieldErrors.adminPassword && (
          <div
            id="adminPassword-error"
            role="alert"
            aria-live="assertive"
            tabIndex="-1"
            className="text-danger mt-1"
          >
            {fieldErrors.adminPassword}
          </div>
        )}
        <InputField
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={(e) => {
            handleChange(e);
            const msg = validateField("email", e.target.value, {
              email: e.target.value,
            });
            setFieldErrors((prev) => ({ ...prev, email: msg }));
            // reset email verification state when email changes
            setEmailCodeSent(false);
            setEmailVerified(false);
            setUserEmailCode("");
            setEmailCodeError("");
            setEmailCodeInfo("");
            setRequestId("");
          }}
        />
        {fieldErrors.email && (
          <div
            id="email-error"
            role="alert"
            aria-live="assertive"
            tabIndex="-1"
            className="text-danger mt-1"
          >
            {fieldErrors.email}
          </div>
        )}
        <div className="d-flex align-items-center gap-2 mt-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleSendEmailCode}
            disabled={emailSending || !!fieldErrors.email || !formData.email}
          >
            {emailSending
              ? t("email_sending", { defaultValue: "Envoi…" })
              : t("send_code", { defaultValue: "Envoyer le code" })}
          </button>

          {emailCodeSent && !emailVerified && (
            <div className="d-flex align-items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={t("enter_code", { defaultValue: "Entrer le code" })}
                className="form-control form-control-sm"
                placeholder={t("enter_code", {
                  defaultValue: "Entrer le code",
                })}
                value={userEmailCode}
                onChange={(e) => setUserEmailCode(e.target.value)}
                style={{ width: 160 }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleVerifyEmailCode}
              >
                {t("verify_code", { defaultValue: "Vérifier" })}
              </button>
            </div>
          )}
        </div>

        {(emailCodeInfo || emailCodeError) && (
          <div
            id="email-code-feedback"
            role="alert"
            aria-live="assertive"
            className={
              emailCodeError ? "text-danger mt-1" : "text-success mt-1"
            }
          >
            {emailCodeError || emailCodeInfo}
          </div>
        )}

        {error && <p className="text-danger">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || hasErrors || !emailVerified}
          aria-disabled={loading || hasErrors || !emailVerified}
        >
          {loading ? t("creating") : t("createTournamentButton")}
        </button>
      </form>
    </div>
  );
};

export default CreateTournament;
