import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const MatchCard = ({ match }) => {
  const { t } = useTranslation();
  const matchDateTime = new Date(`${match.match_day}T${match.match_time}`);
  const formattedTime = matchDateTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const hasResult = match.result && match.result.length > 0;
  let resultDisplay = null;

  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1200);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1200);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scoreBoxStyle = {
    width: isLargeScreen ? "50px" : "25px",
    height: isLargeScreen ? "50px" : "25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: isLargeScreen ? "20px" : "12px",
  };

  const namePlayerStyleTop = {
    marginBottom: isLargeScreen ? "50px" : "30px",
    fontSize: isLargeScreen ? "20px" : "12px",
  };
  const namePlayerStyleButtom = {
    fontSize: isLargeScreen ? "20px" : "12px",
  };

  if (hasResult) {
    const player1Scores = [];
    const player2Scores = [];

    for (let i = 0; i < match.result.length; i += 2) {
      player1Scores.push(match.result[i]);
      if (i + 1 < match.result.length) {
        player2Scores.push(match.result[i + 1]);
      }
    }

    resultDisplay = (
      <div className="text-end">
        <div className="mb-3">
          <div className="d-flex justify-content-end flex-wrap">
            {player1Scores.map((score, index) => (
              <div
                key={index}
                className="border border-primary rounded p-2 m-1"
                style={scoreBoxStyle}
              >
                {score}
              </div>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <div className="d-flex justify-content-end flex-wrap">
            {player2Scores.map((score, index) => (
              <div
                key={index}
                className="border border-success rounded p-2 m-1"
                style={scoreBoxStyle}
              >
                {score}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const referees = [];
  if (match.referee_1) {
    referees.push(`${match.referee_1.firstname} ${match.referee_1.lastname}`);
  }
  if (match.referee_2) {
    referees.push(`${match.referee_2.firstname} ${match.referee_2.lastname}`);
  }

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          {match.group.name} - {match.group.group_type}
        </div>
        <div>
          {t("table")} {match.table_number}
        </div>
      </div>
      <div className="card-body d-flex justify-content-between">
        <div>
          <div style={namePlayerStyleTop}>
            {match.player1.firstname} {match.player1.lastname}
          </div>
          <div style={namePlayerStyleButtom}>
            {match.player2.firstname} {match.player2.lastname}
          </div>
        </div>
        <div>
          {hasResult ? (
            resultDisplay
          ) : (
            <div style={{ textAlign: "right" }}>{formattedTime}</div>
          )}
        </div>
      </div>
      <div className="card-footer">{referees.join(" / ")}</div>
    </div>
  );
};

export default MatchCard;
