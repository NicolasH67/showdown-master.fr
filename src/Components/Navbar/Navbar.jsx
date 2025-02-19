import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import supabase from "../../Helpers/supabaseClient";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const passwordInputRef = useRef(null);
  const [tournamentId, setTournamentId] = useState(null);

  const isTournamentPage = location.pathname.startsWith("/tournament");

  useEffect(() => {
    const id = location.pathname.split("/")[2];
    setTournamentId(id);
  }, [location.pathname]);

  const fetchAdminPassword = async () => {
    if (!tournamentId) return;

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
      setError("Mot de passe incorrect");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setPassword("");
    setError("");
  };

  useEffect(() => {
    if (isModalOpen && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [isModalOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleModalClose();
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape);
    } else {
      document.removeEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isModalOpen]);

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
                  Accueil
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
                      Historique
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink
                      to="/createTournament"
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                    >
                      Créer un nouveau tournoi
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
                  Contact
                </NavLink>
              </li>

              {isTournamentPage && tournamentId && (
                <>
                  <li className="nav-item">
                    <NavLink
                      to={`/tournament/${tournamentId}/${
                        isAdmin ? "admin/players" : "players"
                      }`}
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                    >
                      {isAdmin
                        ? "Édition des Joueurs & Arbitres"
                        : "Joueurs & Arbitres"}
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink
                      to={`/tournament/${tournamentId}/${
                        isAdmin ? "admin/groups" : "groups"
                      }`}
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                    >
                      {isAdmin ? "Édition des Groupes" : "Groupes"}
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink
                      to={`/tournament/${tournamentId}/${
                        isAdmin ? "admin/schedule" : "schedule"
                      }`}
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                    >
                      {isAdmin ? "Édition du Planning" : "Planning"}
                    </NavLink>
                  </li>
                  {isAdmin && (
                    <li className="nav-item">
                      <NavLink
                        to={`/tournament/${tournamentId}/admin/result`}
                        className={({ isActive }) =>
                          isActive ? "nav-link active" : "nav-link"
                        }
                      >
                        Édition des résultats
                      </NavLink>
                    </li>
                  )}
                  <li className="nav-item">
                    {!isAdmin ? (
                      <button
                        onClick={handleLoginClick}
                        className="btn btn-primary"
                      >
                        Admin Login
                      </button>
                    ) : (
                      <NavLink
                        to={`/tournament/${tournamentId}/admin/edit`}
                        className={({ isActive }) =>
                          isActive ? "nav-link active" : "nav-link"
                        }
                      >
                        Édition du tournoi
                      </NavLink>
                    )}
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Entrez le mot de passe admin</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                ref={passwordInputRef}
                aria-label="Mot de passe"
                required
                className="form-control mb-3"
              />
              {error && <p className="text-danger">{error}</p>}
              <button type="submit" className="btn btn-primary">
                Soumettre
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="btn btn-secondary ms-2"
              >
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
