import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import AdminLogin from "../AdminLogin/AdminLogin";

/**
 * Navbar component that provides navigation links and language selection.
 *
 * @component
 * @returns {JSX.Element} The navigation bar with dynamic links based on the current route.
 */
const Navbar = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(true);
  const tournament = location.pathname.match(/\/tournament\/([^/]+)/);
  const id = tournament ? tournament[1] : null;

  // --- Admin detection: always show admin nav when authenticated ---
  const checkAdmin = () => {
    try {
      // Support either a boolean flag or a token saved by AdminLogin
      const flag = localStorage.getItem("isAdmin");
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("admin_jwt");
      if (flag === "true") return true;
      if (typeof token === "string" && token.length > 10) return true;
      return false;
    } catch (_) {
      return false;
    }
  };

  const [isAdmin, setIsAdmin] = useState(checkAdmin());

  // Keep admin state in sync when route changes or storage updates
  useEffect(() => {
    setIsAdmin(checkAdmin());
  }, [location.pathname]);

  useEffect(() => {
    const onStorage = () => setIsAdmin(checkAdmin());
    window.addEventListener("storage", onStorage);
    // Optional custom event if AdminLogin dispatches it
    window.addEventListener("admin-status-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("admin-status-changed", onStorage);
    };
  }, []);

  /**
   * Changes the application language.
   *
   * @param {string} lang - The selected language code (e.g., "en", "fr").
   */
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    setIsDropdownOpen(false);
  };

  /**
   * Toggles the mobile navbar state.
   */
  const toggleNavbar = () => {
    setIsNavbarCollapsed(!isNavbarCollapsed);
  };

  /**
   * Renders the navigation links dynamically based on the current route.
   *
   * @returns {JSX.Element} The list of navigation links.
   */
  const isTournamentPage = location.pathname.includes("/tournament");

  const renderNavbarLinks = () => {
    if (isTournamentPage) {
      if (isAdmin) {
        return (
          <>
            <li className="nav-item">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("home")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("contact")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/admin/players`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("adminPlayers")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/admin/groups`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("adminGroups")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/admin/schedule`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("adminSchedule")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/admin/result`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("adminResult")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/admin/ranking`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("adminRanking")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/admin/tournamentEdit`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("tournamentEdit")}
              </NavLink>
            </li>
            <AdminLogin />
          </>
        );
      } else {
        return (
          <>
            <li className="nav-item">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("home")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("contact")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/players`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("playersAndReferees")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/groups`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("groups")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/ranking`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("rankingNavbar")}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to={`/tournament/${id}/schedule`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("schedule")}
              </NavLink>
            </li>
            <AdminLogin />
          </>
        );
      }
    } else {
      return (
        <>
          <li className="nav-item">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("home")}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/history"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("history")}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/createTournament"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("createTournament")}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("contact")}
            </NavLink>
          </li>
        </>
      );
    }
  };

  useEffect(() => {
    const lang = localStorage.getItem("language") || "en";
    document.documentElement.lang = lang;
  }, [i18n.language]);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          onClick={toggleNavbar}
          aria-controls="navbarNav"
          aria-expanded={!isNavbarCollapsed ? "true" : "false"}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div
          className={`collapse navbar-collapse ${
            isNavbarCollapsed ? "" : "show"
          }`}
          id="navbarNav"
        >
          <ul className="navbar-nav">{renderNavbarLinks()}</ul>
        </div>
        <div className="dropdown">
          <button
            className="btn btn-secondary dropdown-toggle"
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            🌍 {t("language")}
          </button>
          {isDropdownOpen && (
            <ul className="dropdown-menu show">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => changeLanguage("en")}
                >
                  🇬🇧 English
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => changeLanguage("fr")}
                >
                  🇫🇷 Français
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
