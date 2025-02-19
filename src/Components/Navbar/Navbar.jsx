import React, { useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { id } = useParams();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    setIsDropdownOpen(false);
  };

  const isTournamentPage = location.pathname.startsWith("/tournament");
  const isTournamentAdminPage = location.pathname.includes("/admin");

  const renderNavbarLinks = () => {
    if (isTournamentPage) {
      if (isTournamentAdminPage) {
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
                to={`/tournament/${id}/admin/tournamentEdit`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("tournamentEdit")}
              </NavLink>
            </li>
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
                to={`/tournament/${id}/schedule`}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {t("schedule")}
              </NavLink>
            </li>
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

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <div className="collapse navbar-collapse" id="navbarNav">
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
