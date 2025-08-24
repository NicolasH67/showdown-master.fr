import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar/Navbar";
import "./i18n";

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
        <Route path="/tournament/:id/players" element={<Players />} />
        <Route
          path="/tournament/:id/players/:playerId"
          element={<PlayerDetails />}
        />
        <Route
          path="/tournament/:id/referees/:refereeId"
          element={<RefereeDetails />}
        />
        <Route
          path="/tournament/:id/provenance/:provenanceId"
          element={<ProvenanceDetails />}
        />
        <Route path="/tournament/:id/groups" element={<GroupsPage />} />
        <Route path="/tournament/:id/ranking" element={<RankingPage />} />
        <Route path="/tournament/:id/schedule" element={<Schedule />} />
        <Route path="/tournament/:id/admin/players" element={<PlayersEdit />} />
        <Route path="/tournament/:id/admin/groups" element={<GroupsEdit />} />
        <Route
          path="/tournament/:id/admin/schedule"
          element={<ScheduleEdit />}
        />
        <Route path="/tournament/:id/admin/result" element={<ResultEdit />} />
        <Route path="/tournament/:id/admin/ranking" element={<RankingEdit />} />
        <Route
          path="/tournament/:id/admin/tournamentEdit"
          element={<AdminEditPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
