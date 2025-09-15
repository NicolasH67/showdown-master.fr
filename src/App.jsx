import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar/Navbar";
import "./i18n";

import { AdminGuard, ViewerGuard } from "./auth/Guard";

import Home from "./Pages/Home/Home";
import History from "./Pages/History/History";
import CreateTournament from "./Pages/CreateTournament/CreateTournament";
import Contact from "./Pages/Contact/Contact";
import Players from "./Pages/Players/Players";
import GroupsPage from "./Pages/GroupsPage/GroupsPage";
import Schedule from "./Pages/Schedule/Schedule";
import PlayerDetails from "./Pages/PlayerDetails/PlayerDetails";
import RefereeDetails from "./Pages/RefereeDetails/RefereeDetails";
import PlayersEdit from "./Pages/PlayersEdit/PlayerEdit";
import GroupsEdit from "./Pages/GroupsEdit/GroupsEdit";
import ScheduleEdit from "./Pages/ScheduleEdit/ScheduleEdit";
import AdminEditPage from "./Pages/AdminEditPage/AdminEditPage";
import ResultEdit from "./Pages/ResultEdit/ResultEdit";
import ProvenanceDetails from "./Pages/ProvenanceDetails/ProvenanceDetails";
import RankingPage from "./Pages/RankingPage/RankingPage";
import RankingEdit from "./Pages/RankingEdit/RankingEdit";
import GroupsDetails from "./Pages/GoupsDetails/GroupsDetails";

// --- Temporary minimal login pages (replace later with real pages) ---
function AdminLogin() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Connexion Admin</h1>
      <p>Implémente la page de login admin ici (POST /auth/admin/login).</p>
    </div>
  );
}

function TournamentLogin() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Accès Tournoi</h1>
      <p>
        Implémente la page de login tournoi ici (POST /auth/tournament/login).
      </p>
    </div>
  );
}

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
        <Route path="/contact" element={<Contact />} />
        <Route path="/tournament/:id/login" element={<TournamentLogin />} />
        <Route path="/tournament/:id/admin/login" element={<AdminLogin />} />
        <Route
          path="/tournament/:id/players"
          element={
            <ViewerGuard>
              <Players />
            </ViewerGuard>
          }
        />
        <Route
          path="/tournament/:id/players/:playerId"
          element={
            <ViewerGuard>
              <PlayerDetails />
            </ViewerGuard>
          }
        />
        <Route
          path="/tournament/:id/groups/:groupId"
          element={
            <ViewerGuard>
              <GroupsDetails />
            </ViewerGuard>
          }
        />
        <Route
          path="/tournament/:id/referees/:refereeId"
          element={
            <ViewerGuard>
              <RefereeDetails />
            </ViewerGuard>
          }
        />
        <Route
          path="/tournament/:id/provenance/:provenanceId"
          element={
            <ViewerGuard>
              <ProvenanceDetails />
            </ViewerGuard>
          }
        />
        <Route
          path="/tournament/:id/groups"
          element={
            <ViewerGuard>
              <GroupsPage />
            </ViewerGuard>
          }
        />
        <Route
          path="/tournament/:id/ranking"
          element={
            <ViewerGuard>
              <RankingPage />
            </ViewerGuard>
          }
        />
        <Route
          path="/tournament/:id/schedule"
          element={
            <ViewerGuard>
              <Schedule />
            </ViewerGuard>
          }
        />
        <Route
          path="/tournament/:id/admin/players"
          element={
            <AdminGuard>
              <PlayersEdit />
            </AdminGuard>
          }
        />
        <Route
          path="/tournament/:id/admin/groups"
          element={
            <AdminGuard>
              <GroupsEdit />
            </AdminGuard>
          }
        />
        <Route
          path="/tournament/:id/admin/schedule"
          element={
            <AdminGuard>
              <ScheduleEdit />
            </AdminGuard>
          }
        />
        <Route
          path="/tournament/:id/admin/result"
          element={
            <AdminGuard>
              <ResultEdit />
            </AdminGuard>
          }
        />
        <Route
          path="/tournament/:id/admin/ranking"
          element={
            <AdminGuard>
              <RankingEdit />
            </AdminGuard>
          }
        />
        <Route
          path="/tournament/:id/admin/tournamentEdit"
          element={
            <AdminGuard>
              <AdminEditPage />
            </AdminGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
