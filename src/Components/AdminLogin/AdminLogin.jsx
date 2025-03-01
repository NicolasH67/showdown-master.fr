import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "../Button/Button";
import TournamentModal from "../TournamentModal/TournamentModal";
import { useAdminPassword } from "../../Hooks/useAdminPassword";

const AdminLogin = () => {
  const location = useLocation();
  const tournament = location.pathname.match(/\/tournament\/([^/]+)/);
  const id = tournament ? tournament[1] : null;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const storedPassword = useAdminPassword();
  const navigate = useNavigate();

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
      alert("Mot de passe incorrect");
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
        <Button label="Déconnexion Admin" onClick={handleLogout} active />
      ) : (
        <Button
          label="Connexion Admin"
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
          setPassword(""); // Réinitialisation du champ après fermeture
        }}
      />
    </div>
  );
};

export default AdminLogin;
