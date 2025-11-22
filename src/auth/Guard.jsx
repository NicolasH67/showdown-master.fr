import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import useAuth from "./useAuth";
import { get, post } from "../Helpers/apiClient";
import TournamentModal from "../Components/TournamentModal/TournamentModal";

/**
 * Guardes de routes basées sur l'état serveur (cookie httpOnly via /auth/me).
 * - AdminGuard : nécessite scope === "admin" ET un token lié au même tournamentId que l'URL
 * - ViewerGuard : nécessite une session (scope admin OU viewer) ET le même tournamentId
 *
 * Si non conforme => redirection vers la page de login correspondante.
 */

export function AdminGuard({ children }) {
  const { id } = useParams(); // tournament id depuis l'URL
  const location = useLocation();
  const { loading, ok, scope, tournamentId } = useAuth();

  const [showModal, setShowModal] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [modalMessage, setModalMessage] = React.useState("");

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setModalMessage("");
    try {
      // Ici, on est sur le guard ADMIN → utiliser le login ADMIN
      await post("/api/auth/admin/login", { tournamentId: id, password });
      setModalMessage("Mot de passe correct");
      setShowModal(false);
      window.location.reload();
    } catch (err) {
      setModalMessage("Mot de passe incorrect");
    }
  };

  if (loading) return null; // ou un spinner si tu préfères

  const sameTournament = String(tournamentId) === String(id);
  const isAdmin = ok && scope === "admin" && sameTournament;

  if (!isAdmin) {
    return (
      <div className="container mt-5 text-center">
        <h1>Accès refusé</h1>
        <p>Vous n'avez pas accès à l'administration de ce tournoi.</p>
        <button
          className="btn btn-primary mt-3"
          onClick={() => (window.location.href = "/")}
        >
          Retour à l'accueil
        </button>
        <button
          className="btn btn-secondary mt-3 ms-2"
          onClick={() => setShowModal(true)}
        >
          Se connecter avec un mot de passe
        </button>
        <TournamentModal
          isOpen={showModal}
          password={password}
          setPassword={setPassword}
          onSubmit={handlePasswordSubmit}
          onClose={() => setShowModal(false)}
          errorMessage={modalMessage}
        />
      </div>
    );
  }
  return children;
}

export function ViewerGuard({ children }) {
  const { id } = useParams(); // tournament id depuis l'URL
  const location = useLocation();
  const { loading, ok, tournamentId } = useAuth();

  const [showModal, setShowModal] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [modalMessage, setModalMessage] = React.useState("");

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setModalMessage("");
    try {
      await post("/api/auth/tournament/login", { tournamentId: id, password });
      setModalMessage("Mot de passe correct");
      setShowModal(false);
      window.location.reload();
    } catch (err) {
      setModalMessage("Mot de passe incorrect");
    }
  };

  const [pub, setPub] = React.useState({ loading: true, isPrivate: true });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await get(`/api/public/tournaments/${id}`);
        if (cancelled) return;
        setPub({ loading: false, isPrivate: !!t?.is_private });
      } catch (e) {
        if (cancelled) return;
        // Si on ne peut pas déterminer, on reste conservateur: privé
        setPub({ loading: false, isPrivate: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Attendre la vérification public/privé
  if (pub.loading) return null;

  // Si tournoi public, accès libre sans session
  if (pub.isPrivate === false) {
    return children;
  }

  // Tournoi privé → exiger une session (viewer ou admin) liée au même tournoi
  if (loading) return null;
  const sameTournament = String(tournamentId) === String(id);
  const isViewerOrAdmin = ok && sameTournament; // ok => viewer OU admin

  if (!isViewerOrAdmin) {
    return (
      <div className="container mt-5 text-center">
        <h1>Accès au tournoi</h1>
        <p>Vous n'avez pas accès à ce tournoi.</p>
        <button
          className="btn btn-primary mt-3"
          onClick={() => (window.location.href = "/")}
        >
          Retour à l'accueil
        </button>
        <button
          className="btn btn-secondary mt-3 ms-2"
          onClick={() => setShowModal(true)}
        >
          Se connecter avec un mot de passe
        </button>
        <TournamentModal
          isOpen={showModal}
          password={password}
          setPassword={setPassword}
          onSubmit={handlePasswordSubmit}
          onClose={() => setShowModal(false)}
          errorMessage={modalMessage}
        />
      </div>
    );
  }
  return children;
}
