import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

/**
 * A component that renders a table of referees sorted by last name.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {Array} props.referees - A list of referee objects to be displayed in the table.
 *
 * @returns {JSX.Element} A JSX element representing a table of referees.
 */
const RefereeTable = ({ referees }) => {
  const { id } = useParams();
  const { t } = useTranslation();

  const sortReferees = (referees) => {
    return referees.sort((a, b) =>
      a.lastname.toLowerCase().localeCompare(b.lastname.toLowerCase())
    );
  };

  return (
    <>
      {referees.length > 0 && (
        <>
          <h2>{t("refereesList")}</h2>
          <div className="container mt-4">
            <table className="table table-bordered table-hover">
              <thead>
                <tr>
                  <th>{t("nameRefereeTable")}</th>
                  <th>{t("club")}</th>
                </tr>
              </thead>
              <tbody>
                {sortReferees(referees).map((referee) => (
                  <tr key={referee.id} style={{ cursor: "pointer" }}>
                    <td>
                      <Link
                        to={`/tournament/${id}/referees/${referee.id}`}
                        style={{ textDecoration: "none" }}
                      >
                        {referee.firstname} {referee.lastname}
                      </Link>
                    </td>
                    <td>{referee.club ? referee.club.name : t("noClub")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default RefereeTable;
