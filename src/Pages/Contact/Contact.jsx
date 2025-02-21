import React from "react";
import useContactForm from "../../Hooks/useContactForm";
import InputField from "../../Components/InputField/InputField";
import TextAreaField from "../../Components/TextAreaField/TextAreaField";
import { useTranslation } from "react-i18next";

const Contact = () => {
  const { formData, handleChange, handleSubmit, error, success } =
    useContactForm();
  const { t, i18n } = useTranslation();

  return (
    <div className="container mt-5">
      <h1 className="mb-4">{t("contactUs")}</h1>
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
