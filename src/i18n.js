import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

/**
 * i18n configuration for managing translations in the React application.
 * Uses the backend to load language files and a language detector to automatically
 * choose the user's preferred language.
 *
 * @module i18n
 */
i18n
  /**
   * Loads external JSON translation files via HTTP.
   *
   * @function
   */
  .use(HttpApi)
  /**
   * Detects the browser language or uses the language stored in localStorage.
   *
   * @function
   */
  .use(LanguageDetector)
  /**
   * Initializes i18n for React, enabling the integration with React through the useTranslation hook.
   *
   * @function
   */
  .use(initReactI18next)
  .init({
    /**
     * Supported languages in the application.
     *
     * @type {Array<string>}
     */
    supportedLngs: ["en", "fr"],
    /**
     * Default language to use if the user's language is not available.
     *
     * @type {string}
     */
    fallbackLng: "en",
    /**
     * Enables debug logs during development.
     *
     * @type {boolean}
     */
    debug: true,
    detection: {
      /**
       * Determines the order in which i18next detects the user's preferred language.
       * First, it checks localStorage, then the browser language.
       *
       * @type {Array<string>}
       */
      order: ["localStorage", "navigator"],
      /**
       * Specifies caching mechanisms for the chosen language (here, localStorage).
       *
       * @type {Array<string>}
       */
      caches: ["localStorage"],
    },
    backend: {
      /**
       * Path to load the JSON language files. Make sure the files are located at this path.
       *
       * @type {string}
       */
      loadPath: "/locales/{{lng}}.json",
    },
    interpolation: {
      /**
       * Disables escaping of interpolated values, as React handles XSS protection.
       *
       * @type {boolean}
       */
      escapeValue: false,
    },
  });

export default i18n;
