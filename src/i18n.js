import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(HttpApi) // Charge les fichiers JSON externes
  .use(LanguageDetector) // Détecte la langue du navigateur/localStorage
  .use(initReactI18next)
  .init({
    supportedLngs: ["en", "fr"], // Assure-toi que les langues sont bien supportées
    fallbackLng: "en",
    debug: true,
    lng: "en",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"], // Sauvegarde la langue choisie
    },
    backend: {
      loadPath: "../src/locales/{{lng}}.json", // Vérifie que les fichiers sont bien à cet emplacement
    },
    interpolation: {
      escapeValue: false, // React se charge déjà d'éviter les failles XSS
    },
  });

export default i18n;
