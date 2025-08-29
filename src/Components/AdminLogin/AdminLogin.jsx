import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "../Button/Button";
import TournamentModal from "../TournamentModal/TournamentModal";
import { useAdminPassword } from "../../Hooks/useAdminPassword";
import { useTranslation } from "react-i18next";

const AdminLogin = () => {
  const location = useLocation();
  const tournament = location.pathname.match(/\/tournament\/([^/]+)/);
  const id = tournament ? tournament[1] : null;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const storedPassword = useAdminPassword();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const adminStatus = localStorage.getItem("isAdmin");
    if (adminStatus === "true") {
      setIsAdmin(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const adminPwd = storedPassword?.[0]?.admin_password;
    if (adminPwd && password === adminPwd) {
      localStorage.setItem("isAdmin", "true");
      // Inform the app (Navbar, etc.) that admin status changed
      window.dispatchEvent(new Event("admin-status-changed"));
      setIsAdmin(true);
      setIsModalOpen(false);
      setPassword("");
      setModalMessage("");
      if (id) {
        navigate(`/tournament/${id}/admin/players`);
      }
    } else {
      setModalMessage(
        t("wrongPassword", { defaultValue: "Mot de passe incorrect." })
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    // Inform the app (Navbar, etc.) that admin status changed
    window.dispatchEvent(new Event("admin-status-changed"));
    setIsAdmin(false);
    if (id) {
      navigate(`/tournament/${id}/players`);
    }
  };

  return (
    <div>
      {isAdmin ? (
        <Button label={t("logout")} onClick={handleLogout} active />
      ) : (
        <Button
          label={t("login")}
          onClick={() => setIsModalOpen(true)}
          active
        />
      )}
      <TournamentModal
        isOpen={isModalOpen}
        password={password}
        setPassword={setPassword}
        onSubmit={handleLogin}
        onClose={() => {
          setIsModalOpen(false);
          setPassword("");
          setModalMessage("");
        }}
        errorMessage={modalMessage}
      />
    </div>
  );
};

export default AdminLogin;
