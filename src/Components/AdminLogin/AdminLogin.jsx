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

    const payload = {
      tournamentId: tournamentIdNum,
      password: String(password).trim(),
    };

    // Essaye d'abord l'URL serverless Vercel (/api/...), puis fallback monolithe (/auth/...)
    const urls = ["/api/auth/admin/login", "/auth/admin/login"];

    let lastError = null;
    let success = false;

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          success = true;
          break;
        }

        // tente d'extraire le code d'erreur JSON sinon garde le status
        let body = null;
        try {
          body = await res.json();
        } catch {
          body = { error: String(res.status) };
        }
        lastError = { status: res.status, body };

        // Si 404/405 sur cette variante, on essaie la suivante
        if (res.status === 404 || res.status === 405) continue;

        // pour tout autre code, on arrête ici
        break;
      } catch (err) {
        lastError = err;
        // on essaie la variante suivante
      }
    }

    if (!success) {
      const code =
        lastError?.body?.error ||
        lastError?.status ||
        lastError?.message ||
        (typeof lastError === "string" ? lastError : "login_failed");

      if (process.env.NODE_ENV !== "production") {
        console.error("[AdminLogin] login failed:", code, lastError);
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
        fallback =
          "Route d'authentification indisponible (405). Vérifiez l'URL.";
      } else if (
        code === "Missing fields" ||
        code === "missing_fields" ||
        String(code).toLowerCase().includes("missing")
      ) {
        msgKey = "missingFields";
        fallback = "Champs manquants.";
      }

      setErrorMessage(t(msgKey, { defaultValue: fallback }));
      return;
    }

    // Synchronise l'état auth (cookie httpOnly) → hook
    await refresh();

    // Fermer la modal et rediriger
    setIsModalOpen(false);
    setPassword("");
    setErrorMessage("");

    const backTo =
      location.state?.from || `/tournament/${tournamentIdNum}/admin/players`;
    navigate(backTo, { replace: true });
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
