import React from "react";
import useContactForm from "../../Hooks/useContactForm";
import InputField from "../../Components/InputField/InputField";
import TextAreaField from "../../Components/TextAreaField/TextAreaField";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

/**
 * Contact Component - Displays a contact form allowing users to send messages.
 *
 * This component uses a custom hook `useContactForm` to handle form state and submission.
 * It includes input fields for name, email, and message, along with form validation and feedback.
 *
 * @component
 * @returns {JSX.Element} A contact form UI.
 */
const Contact = () => {
  const { formData, handleChange, handleSubmit, error, success } =
    useContactForm();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
  };

  /**
   * Executes handleLogout on page load.
   */
  useEffect(() => {
    handleLogout();
  }, []);

  return (
    <div className="container mt-5">
      <h1 className="mb-4" autoFocus>
        {t("contactUs")}
      </h1>
      <form onSubmit={handleSubmit} className="contact-form">
        <InputField
          label={t("name")}
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
        />
        <InputField
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
        <TextAreaField
          label={t("message")}
          name="message"
          value={formData.message}
          onChange={handleChange}
        />

        {error && <p className="text-danger">{error}</p>}
        {success && <p className="text-success">{success}</p>}

        <button type="submit" className="btn btn-primary">
          {t("submit")}
        </button>
      </form>
    </div>
  );
};

export default Contact;
