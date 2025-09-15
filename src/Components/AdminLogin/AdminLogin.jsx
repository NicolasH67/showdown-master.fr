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
      await post("/auth/admin/login", {
        tournamentId: tournamentIdNum,
        password: String(password).trim(),
      });
      await refresh(); // synchronise le hook useAuth avec le serveur
      const backTo =
        location.state?.from || `/tournament/${tournamentIdNum}/admin/players`;
      navigate(backTo, { replace: true });
    } catch (err) {
      const detail = err?.body?.error || err?.message || "";
      console.error("/auth/admin/login error:", detail);
      setErrorMessage(
        t("wrongPassword", { defaultValue: "Mot de passe incorrect." })
      );
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
