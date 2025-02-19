import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar/Navbar";

const Home = () => <h1>Home</h1>;
const History = () => <h1>History</h1>;
const CreateTournament = () => <h1>Create Tournament</h1>;
const Contact = () => <h1>Contact</h1>;
const TournamentPlayers = () => <h1>Tournament Players</h1>;
const TournamentGroups = () => <h1>Tournament Groups</h1>;
const TournamentSchedule = () => <h1>Tournament Schedule</h1>;
const AdminPlayers = () => <h1>Tournament Admin Players</h1>;
const AdminGroups = () => <h1>Tournament Admin Groups</h1>;
const AdminSchedule = () => <h1>Tournament Admin Schedule</h1>;
const AdminResult = () => <h1>Tournament Admin Result</h1>;
const TournamentEdit = () => <h1>Tournament Edit</h1>;

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/createTournament" element={<CreateTournament />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/tournament/:id">
          <Route path="players" element={<TournamentPlayers />} />
          <Route path="groups" element={<TournamentGroups />} />
          <Route path="schedule" element={<TournamentSchedule />} />
          <Route path="admin">
            <Route path="players" element={<AdminPlayers />} />
            <Route path="groups" element={<AdminGroups />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="result" element={<AdminResult />} />
            <Route path="tournamentEdit" element={<TournamentEdit />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
