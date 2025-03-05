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
        <Route path="/tournament/:id/groups" element={<GroupsPage />} />
        <Route path="/tournament/:id/schedule" element={<Schedule />} />
        <Route path="/tournament/:id/admin/players" element={<PlayersEdit />} />
        <Route
          path="/tournament/:id/admin/groups"
          element={
            <div>
              <h1>groups admin</h1>
            </div>
          }
        />
        <Route
          path="/tournament/:id/admin/schedule"
          element={
            <div>
              <h1>schedule admin</h1>
            </div>
          }
        />
        <Route
          path="/tournament/:id/admin/result"
          element={
            <div>
              <h1>result admin</h1>
            </div>
          }
        />
        <Route
          path="/tournament/:id/admin/tournamentEdit"
          element={
            <div>
              <h1>tournament edit admin</h1>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
