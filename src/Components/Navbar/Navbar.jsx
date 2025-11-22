import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLogin from "../AdminLogin/AdminLogin";
import Button from "../Button/Button";
import useAuth from "../../auth/useAuth";
import { post } from "../../Helpers/apiClient";

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
  const [loggingOut, setLoggingOut] = useState(false);
  const tournament = location.pathname.match(/\/tournament\/([^/]+)/);
  const id = tournament ? tournament[1] : null;

  // Auth state from cookie-backed session
  const { loading, ok, scope, tournamentId, refresh } = useAuth();
  // Clef de re-render fiable quand l'état d'auth change
  const authKey = `${ok ? "1" : "0"}-${scope || "none"}-${tournamentId ?? "x"}`;
  const currentId = id ? Number(id) : null;
  // Affiche la barre admin uniquement si la session admin correspond AU tournois courant
  // (ex. connecté admin du tournoi 11, mais sur la page du tournoi 19 -> barre publique)
  const isAdminForCurrentTournament =
    ok && scope === "admin" && Number(tournamentId) === currentId;

  // Sync auth on route change to avoid stale navbar after login/logout
  useEffect(() => {
    (async () => {
      try {
        await refresh?.();
      } catch (_) {}
    })();
    // We only want to re-check when the route changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const lang = localStorage.getItem("language") || "en";
    document.documentElement.lang = lang;
  }, [i18n.language]);

  useEffect(() => {
    // Dès que l'état d'authentification change, on force un repli (mobile)
    setIsNavbarCollapsed(true);
  }, [authKey]);

  if (loading) {
    // During auth resolution, show a neutral navbar
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <span className="navbar-brand">Showdown</span>
        </div>
      </nav>
    );
  }

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
      if (isAdminForCurrentTournament) {
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
            <li className="nav-item ms-2 d-flex align-items-center">
              <Button
                label={
                  loggingOut
                    ? t("loggingOut", { defaultValue: "Logging out…" })
                    : t("logout", { defaultValue: "Logout" })
                }
                onClick={async () => {
                  const currentTournamentId = id ? Number(id) : null;
                  let savedPwd = null;

                  // Récupère le mot de passe user mémorisé pour ce tournoi
                  try {
                    if (currentTournamentId != null) {
                      savedPwd = sessionStorage.getItem(
                        `tournamentPassword:${currentTournamentId}`
                      );
                    }
                  } catch (_) {
                    // ignore storage issues
                  }

                  setLoggingOut(true);

                  // 1) On déconnecte complètement (admin + viewer)
                  try {
                    await fetch("/api/auth/logout", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                    });
                  } catch (e) {
                    console.error("[Navbar] logout error", e);
                  }

                  // 2) Si on a mémorisé un mot de passe user pour ce tournoi,
                  //    on tente une reconnexion immédiate côté viewer
                  if (savedPwd && currentTournamentId != null) {
                    try {
                      await post("/api/auth/tournament/login", {
                        tournamentId: currentTournamentId,
                        password: savedPwd,
                      });

                      // Reconnexion viewer réussie : on force un rechargement
                      // complet sur la page joueurs du tournoi pour que les guards
                      // et useAuth soient parfaitement synchronisés.
                      window.location.href = `/tournament/${currentTournamentId}/players`;
                      return;
                    } catch (e) {
                      console.error("[Navbar] auto user relogin failed", e);
                      // on continue le flux normal vers la home ou players
                    }
                  }

                  // 3) Pas de mot de passe sauvegardé ou relogin échoué :
                  //    on rafraîchit l'état d'auth et on redirige comme avant.
                  try {
                    await refresh?.();
                  } catch (e) {
                    console.error("[Navbar] refresh error", e);
                  }

                  try {
                    setIsNavbarCollapsed(true);
                  } catch (_) {}

                  const onTournamentPage =
                    location.pathname.includes("/tournament/");
                  if (onTournamentPage && id) {
                    navigate(`/tournament/${id}/players`, { replace: true });
                  } else {
                    navigate("/", { replace: true });
                  }
                  setLoggingOut(false);
                }}
                active
                disabled={loggingOut}
                ariaLabel={t("logout", { defaultValue: "Logout" })}
                title={t("logout", { defaultValue: "Logout" })}
                variant="primary"
                className="btn btn-primary"
                style={{
                  backgroundColor: "#0d6efd",
                  borderColor: "#0d6efd",
                  color: "#fff",
                }}
              />
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

  return (
    <nav key={authKey} className="navbar navbar-expand-lg navbar-dark bg-dark">
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
          <ul key={authKey} className="navbar-nav">
            {renderNavbarLinks()}
          </ul>
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
