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
  // Fallback 1: lire /tournament/:id depuis l'URL si useParams est vide
  const pathMatch = (location.pathname || "").match(/\/tournament\/(\d+)/);
  const pathId = pathMatch ? pathMatch[1] : null;

  const resolvedId =
    params?.id ?? location.state?.tournamentId ?? search.get("id") ?? pathId;

  const tournamentIdNum = Number(resolvedId);
  if (process.env.NODE_ENV !== "production") {
    // aide debug: voir d'où vient l'id
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
    try {
      if (!Number.isFinite(tournamentIdNum) || tournamentIdNum <= 0) {
        setErrorMessage(
          t("errorMissingTournamentId", {
            defaultValue: "ID du tournoi manquant.",
          })
        );
        return;
      }
      await post("/tournaments/auth", {
        tournamentId: tournamentIdNum,
        password: String(password).trim(),
      });
      await refresh(); // synchronise le hook useAuth avec le serveur
      const backTo =
        location.state?.from || `/tournament/${tournamentIdNum}/admin/players`;
      navigate(backTo, { replace: true });
    } catch (err) {
      const code = err?.body?.error || err?.status || err?.message || "";
      console.error("/tournaments/auth error:", code);

      let msgKey = "wrongPassword";
      let fallback = "Mot de passe incorrect.";

      if (code === "not_found" || String(code).includes("404")) {
        msgKey = "tournamentNotFound"; // i18n optionnel
        fallback = "Tournoi introuvable.";
      } else if (code === "tournament_public") {
        msgKey = "tournamentIsPublic"; // i18n optionnel
        fallback =
          "Ce tournoi est public : la connexion admin n'est pas requise.";
      } else if (
        code === "Method Not Allowed" ||
        String(code).includes("405")
      ) {
        msgKey = "routeNotAllowed";
        fallback = "Route d'authentification indisponible (405).";
      } else if (code === "Missing fields") {
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
