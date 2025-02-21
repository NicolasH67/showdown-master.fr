import { useState } from "react";
import { useTranslation } from "react-i18next";
import emailjs from "emailjs-com";

const useContactForm = () => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const userId = import.meta.env.VITE_EMAILJS_USER_ID;
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

    // Utiliser EmailJS pour envoyer l'email
    emailjs
      .send(
        serviceId, // Ton ID de service EmailJS
        templateId, // Ton ID de modèle d'email
        formData, // Les données que tu veux envoyer (nom, email, message)
        userId
      )
      .then(
        (result) => {
          console.log("Message envoyé:", result.text);
          setSuccess(t("contactSuccess"));
          setFormData({ name: "", email: "", message: "" });
        },
        (error) => {
          console.error("Erreur lors de l'envoi de l'email:", error.text);
          setError(t("contactError"));
        }
      );
  };

  return { formData, handleChange, handleSubmit, error, success };
};

export default useContactForm;
