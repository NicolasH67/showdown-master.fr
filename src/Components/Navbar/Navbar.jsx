import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import supabase from "../../Helpers/supabaseClient";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState(null);
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem("isAdmin") === "true"
  );
  const [error, setError] = useState("");
  const passwordInputRef = useRef(null);
  const [tournamentId, setTournamentId] = useState(null);

  // Gérer l'état pour l'ouverture du dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const isTournamentPage = location.pathname.startsWith("/tournament");

  useEffect(() => {
    const id = location.pathname.split("/")[2];
    setTournamentId(id);
  }, [location.pathname]);

  const fetchAdminPassword = async () => {
    if (!tournamentId || isAdmin) return;

    const { data, error } = await supabase
      .from("tournament")
      .select("admin_password")
      .eq("id", tournamentId)
      .single();

    if (error) {
      console.error(
        "Erreur lors de la récupération du mot de passe admin :",
        error
      );
      return;
    }

    setAdminPassword(data?.admin_password);
  };

  useEffect(() => {
    fetchAdminPassword();
  }, [tournamentId]);

  const handleLoginClick = () => {
    setIsModalOpen(true);
    setError("");
    setPassword("");
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    if (password === adminPassword) {
      setIsModalOpen(false);
      setIsAdmin(true);
      localStorage.setItem("isAdmin", "true");
      console.log("Mot de passe correct");

      if (location.pathname.includes("players")) {
        navigate(`/tournament/${tournamentId}/admin/players`);
      } else if (location.pathname.includes("groups")) {
        navigate(`/tournament/${tournamentId}/admin/groups`);
      } else if (location.pathname.includes("schedule")) {
        navigate(`/tournament/${tournamentId}/admin/schedule`);
      } else {
        navigate(`/tournament/${tournamentId}/admin/edit`);
      }
    } else {
      setError(t("wrongPassword"));
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setPassword("");
    setError("");
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    setIsDropdownOpen(false); // Ferme le dropdown après un changement de langue
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
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
              {!isTournamentPage && (
                <>
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
                </>
              )}
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
            </ul>
          </div>
          <div className="dropdown">
            <button
              className="btn btn-secondary dropdown-toggle"
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)} // Basculer l'état du dropdown
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{t("enterAdminPassword")}</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                ref={passwordInputRef}
                aria-label={t("password")}
                required
                className="form-control mb-3"
              />
              {error && <p className="text-danger">{error}</p>}
              <button type="submit" className="btn btn-primary">
                {t("submit")}
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="btn btn-secondary ms-2"
              >
                {t("cancel")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
