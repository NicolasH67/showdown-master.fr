import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Button from "../Button/Button";
import TournamentModal from "../TournamentModal/TournamentModal";
import { useTranslation } from "react-i18next";
import { post } from "../../Helpers/apiClient";
import useAuth from "../../auth/useAuth";

const AdminLogin = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Résolution robuste de l'ID du tournoi
  const search = new URLSearchParams(location.search);

  // Supporte /tournament/:id ET /tournaments/:id (singulier/pluriel)
  const pathname = location.pathname || "";
  const pathMatchSingular = pathname.match(/\/tournament\/(\d+)/);
  const pathMatchPlural = pathname.match(/\/tournaments\/(\d+)/);
  const pathId = pathMatchSingular?.[1] || pathMatchPlural?.[1] || null;

  // Order: params → state → query → path fallback
  const resolvedId =
    params?.id ?? location.state?.tournamentId ?? search.get("id") ?? pathId;

  const tournamentIdNum = Number(resolvedId);
  if (process.env.NODE_ENV !== "production") {
    console.log("[AdminLogin] id sources:", {
      params: params?.id,
      state: location.state?.tournamentId,
      query: search.get("id"),
      pathId,
      resolvedId,
      tournamentIdNum,
    });
  }

  const { loading, ok, scope, tournamentId, refresh } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Si déjà admin du bon tournoi, redirige directement vers la page admin
  useEffect(() => {
    if (
      !loading &&
      ok &&
      scope === "admin" &&
      Number(tournamentId) === Number(tournamentIdNum)
    ) {
      const backTo =
        location.state?.from || `/tournament/${tournamentIdNum}/admin/players`;
      navigate(backTo, { replace: true });
    }
  }, [
    loading,
    ok,
    scope,
    tournamentId,
    tournamentIdNum,
    location.state,
    navigate,
  ]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!Number.isFinite(tournamentIdNum) || tournamentIdNum <= 0) {
      setErrorMessage(
        t("errorMissingTournamentId", {
          defaultValue: "ID du tournoi manquant.",
        })
      );
      return;
    }

    try {
      // IMPORTANT : utiliser la route backend réellement exposée
      // Backend actuel (server.js) : POST /auth/admin/login
      // (ne pas utiliser /tournaments/auth qui n'existe pas sur ton monolithe)
      await post("/auth/admin/login", {
        tournamentId: tournamentIdNum,
        password: String(password).trim(),
      });

      // Synchronise l'état auth (cookie httpOnly) → hook
      await refresh();

      // Fermer la modal et rediriger
      setIsModalOpen(false);
      setPassword("");
      setErrorMessage("");

      const backTo =
        location.state?.from || `/tournament/${tournamentIdNum}/admin/players`;
      navigate(backTo, { replace: true });
    } catch (err) {
      // Unifier l'extraction de code d'erreur
      const code =
        err?.body?.error ||
        err?.status ||
        err?.message ||
        (typeof err === "string" ? err : "");

      if (process.env.NODE_ENV !== "production") {
        console.error("[AdminLogin] /auth/admin/login error:", code, err);
      }

      let msgKey = "wrongPassword";
      let fallback = "Mot de passe incorrect.";

      if (code === "not_found" || String(code).includes("404")) {
        msgKey = "tournamentNotFound";
        fallback = "Tournoi introuvable.";
      } else if (code === "tournament_public") {
        msgKey = "tournamentIsPublic";
        fallback =
          "Ce tournoi est public : la connexion admin n'est pas requise.";
      } else if (
        code === "Method Not Allowed" ||
        String(code).includes("405")
      ) {
        msgKey = "routeNotAllowed";
        fallback = "Route d'authentification indisponible (405).";
      } else if (
        code === "Missing fields" ||
        code === "missing_fields" ||
        String(code).includes("Missing")
      ) {
        msgKey = "missingFields";
        fallback = "Champs manquants.";
      }

      setErrorMessage(t(msgKey, { defaultValue: fallback }));
    }
  };

  const badId = !Number.isFinite(tournamentIdNum) || tournamentIdNum <= 0;

  return (
    <div>
      {badId && (
        <div className="alert alert-warning" role="alert">
          {t("errorMissingTournamentId", {
            defaultValue:
              "Impossible de déterminer l'ID du tournoi depuis l'URL. Revenez à l'accueil et réessayez.",
          })}
        </div>
      )}
      <Button
        label={t("login")}
        onClick={() => setIsModalOpen(true)}
        active
        disabled={badId}
      />
      <TournamentModal
        key={isModalOpen ? "open" : "closed"}
        isOpen={isModalOpen}
        password={password}
        setPassword={setPassword}
        onSubmit={(e) => {
          e?.preventDefault?.();
          if (!String(password).trim()) return;
          handleLogin(e);
        }}
        onClose={() => {
          setIsModalOpen(false);
          setPassword("");
          setErrorMessage("");
        }}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default AdminLogin;
