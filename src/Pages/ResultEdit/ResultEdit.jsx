import React from "react";
import { useParams } from "react-router-dom";
import useMatchesResult from "../../Hooks/useMatchResult";
import MatchRowResult from "../../Components/MatchRowResult/MatchRowResult";

const ResultEdit = () => {
  const { id } = useParams();
  const {
    matches,
    referees,
    loading,
    error,
    results,
    handleMatchChange,
    handleResultChange,
    handleSave,
    handleResultSubmit,
  } = useMatchesResult(id);

  if (loading) {
    return <div>Chargement des matchs...</div>;
  }

  if (error) {
    return (
      <div>Erreur lors de la récupération des matchs : {error.message}</div>
    );
  }

  return (
    <div className="container">
      <h1>Planning des matchs</h1>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th style={{ minWidth: "40px" }}>N°</th>
              <th style={{ minWidth: "100px" }}>Date</th>
              <th style={{ minWidth: "80px" }}>Heure</th>
              <th style={{ minWidth: "60px" }}>Table</th>
              <th style={{ minWidth: "80px" }}>Groupe</th>
              <th style={{ minWidth: "150px" }}>Joueur</th>
              <th style={{ minWidth: "300px" }}>Résultat</th>
              <th style={{ minWidth: "150px" }}>Arbitre</th>
              <th style={{ minWidth: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match, index) => (
              <MatchRowResult
                key={match.id}
                match={match}
                index={index}
                referees={referees}
                results={results}
                onMatchChange={handleMatchChange}
                onResultChange={handleResultChange}
                onSave={handleSave}
                onResultSubmit={handleResultSubmit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultEdit;
