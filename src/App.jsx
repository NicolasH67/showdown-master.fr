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
import History from "./Pages/History/History";
import CreateTournament from "./Pages/CreateTournament/CreateTournament";

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

const TournamentPage = ({ textKey }) => {
  const { id } = useParams();
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t(textKey)}</h1>
      <p>{t("tournamentDetails", { id })}</p> <p>{id}</p>
    </div>
  );
};

/**
 * Main App component that contains routing logic using react-router-dom.
 *
 * @component
 * @example
 * return (
 *   <App />
 * )
 */
function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/createTournament" element={<CreateTournament />} />
        <Route path="/contact" element={<Page textKey="contact" />} />

        {/* Routes du tournoi */}
        <Route
          path="/tournament/:id"
          element={<TournamentPage textKey="tournament" />}
        >
          <Route path="players" element={<Page textKey="players" />} />
          <Route path="groups" element={<Page textKey="groups" />} />
          <Route path="schedule" element={<Page textKey="schedule" />} />

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
