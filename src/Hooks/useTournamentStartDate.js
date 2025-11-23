import { useState, useEffect } from "react";

const useTournamentStartDate = (id) => {
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchTournamentStartDate = async () => {
      try {
        const response = await fetch(`/api/tournament/${id}/startday`);

        if (!response.ok) {
          console.error(
            "Erreur API de récupération de la date de début :",
            response.statusText
          );
          setStartDate("");
          return;
        }

        const json = await response.json();

        if (json && json.startday) {
          setStartDate(json.startday);
        } else {
          // Aucune date définie pour ce tournoi, on laisse une chaîne vide
          setStartDate("");
        }
      } catch (err) {
        console.error("Erreur lors de l'appel API :", err);
        setStartDate("");
      }
    };

    fetchTournamentStartDate();
  }, [id]);

  return startDate;
};

export default useTournamentStartDate;
