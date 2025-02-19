import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  NavLink,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "./Components/Navbar/Navbar";
import "./i18n";

import Home from "./Pages/Home/Home";

// Composant générique pour afficher une page avec traduction
const Page = ({ textKey }) => {
  const { t } = useTranslation();
  return (
    <>
      <h1>{t(textKey)}</h1>;
      <NavLink
        to="/tournament/1/players"
        className={({ isActive }) =>
          isActive ? "nav-link active" : "nav-link"
        }
      >
        {t("player")}
      </NavLink>
      <NavLink
        to="/tournament/1/admin/players"
        className={({ isActive }) =>
          isActive ? "nav-link active" : "nav-link"
        }
      >
        {t("adminPlayers")}
      </NavLink>
    </>
  );
};

// Composant pour gérer les pages liées au tournoi
const TournamentPage = ({ textKey }) => {
  const { id } = useParams(); // Récupère l'ID du tournoi depuis l'URL
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t(textKey)}</h1>
      <p>{t("tournamentDetails", { id })}</p> <p>{id}</p>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<Page textKey="history" />} />
        <Route
          path="/createTournament"
          element={<Page textKey="createTournament" />}
        />
        <Route path="/contact" element={<Page textKey="contact" />} />

        {/* Routes du tournoi */}
        <Route
          path="/tournament/:id"
          element={<TournamentPage textKey="tournament" />}
        >
          <Route path="players" element={<Page textKey="players" />} />
          <Route path="groups" element={<Page textKey="groups" />} />
          <Route path="schedule" element={<Page textKey="schedule" />} />

          {/* Routes admin */}
          <Route path="admin">
            <Route path="players" element={<Page textKey="adminPlayers" />} />
            <Route path="groups" element={<Page textKey="adminGroups" />} />
            <Route path="schedule" element={<Page textKey="adminSchedule" />} />
            <Route path="result" element={<Page textKey="adminResult" />} />
            <Route
              path="tournamentEdit"
              element={<Page textKey="adminTournamentEdit" />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
