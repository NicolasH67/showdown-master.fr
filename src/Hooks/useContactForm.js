import { useState } from "react";
import { useTranslation } from "react-i18next";

const useContactForm = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name || !formData.email || !formData.message) {
      setError(t("contactError"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t("contactInvalidEmail"));
      return;
    }

    setSuccess(t("contactSuccess"));
    setFormData({ name: "", email: "", message: "" });
  };

  return { formData, handleChange, handleSubmit, error, success };
};

export default useContactForm;
