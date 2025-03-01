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
    if (storedPassword && password === storedPassword[0].admin_password) {
      localStorage.setItem("isAdmin", "true");
      setIsAdmin(true);
      setIsModalOpen(false);
      setPassword("");
      navigate(`/tournament/${id}/admin/players`);
    } else {
      alert(t("wrongPassword"));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    setIsAdmin(false);
    navigate(`/tournament/${id}/players`);
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
        }}
      />
    </div>
  );
};

export default AdminLogin;
