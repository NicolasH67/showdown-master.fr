import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "./Components/Navbar/Navbar";
import "./i18n";

const Page = ({ textKey }) => {
  const { t } = useTranslation();
  return <h1>{t(textKey)}</h1>;
};

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Page textKey="home" />} />
        <Route path="/history" element={<Page textKey="history" />} />
        <Route
          path="/createTournament"
          element={<Page textKey="createTournament" />}
        />
        <Route path="/contact" element={<Page textKey="contact" />} />
        <Route path="/tournament/:id">
          <Route path="players" element={<Page textKey="player" />} />
          <Route path="groups" element={<Page textKey="groups" />} />
          <Route path="schedule" element={<Page textKey="schedule" />} />
          <Route path="admin">
            <Route path="players" element={<Page textKey="admin" />} />
            <Route path="groups" element={<Page textKey="groups" />} />
            <Route path="schedule" element={<Page textKey="schedule" />} />
            <Route path="result" element={<Page textKey="admin" />} />
            <Route path="tournamentEdit" element={<Page textKey="admin" />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
