import React from "react";
import { useTranslation } from "react-i18next";

const TournamentList = ({ tournaments, onTournamentClick }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className="container mt-4">
      <table className="table table-bordered table-hover">
        <thead>
          <tr>
            <th>{t("titleNameTournament")}</th>
            <th>{t("titleStartDay")}</th>
            <th>{t("titleEndDay")}</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.length > 0 ? (
            tournaments.map((tournament) => (
              <tr
                key={tournament.id}
                onClick={() => onTournamentClick(tournament)}
                style={{ cursor: "pointer" }}
              >
                <td>
                  {tournament.title}{" "}
                  {tournament.user_password && (
                    <span className="badge bg-danger">{t("private")}</span>
                  )}
                </td>
                <td>
                  {new Intl.DateTimeFormat("fr-FR").format(
                    new Date(tournament.startday)
                  )}
                </td>
                <td>
                  {new Intl.DateTimeFormat("fr-FR").format(
                    new Date(tournament.endday)
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center">
                {t("messageNoUpcomingTournaments")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TournamentList;
