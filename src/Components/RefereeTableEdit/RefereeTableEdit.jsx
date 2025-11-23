import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

const RefereeTableEdit = ({ referees, onDelete, onEdit, clubs }) => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState(null);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [club, setClub] = useState("");

  const handleShowModal = (referee) => {
    setSelectedReferee(referee);
    setFirstname(referee.firstname || "");
    setLastname(referee.lastname || "");
    // Prefer explicit club_id if present, fallback to nested club.id, else empty string
    const initialClubId =
      referee.club_id != null
        ? String(referee.club_id)
        : referee.club?.id != null
        ? String(referee.club.id)
        : "";
    setClub(initialClubId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReferee(null);
  };

  const handleEdit = async () => {
    if (!selectedReferee || !selectedReferee.id) {
      return;
    }

    const parsedClubId = club === "" ? null : Number(club);
    const updatedData = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      club_id: parsedClubId,
    };

    try {
      const res = await fetch(
        `/api/admin/tournaments/${id}/referees/${selectedReferee.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(updatedData),
        }
      );

      if (!res.ok) {
        let errDetail = null;
        try {
          errDetail = await res.json();
        } catch (_) {
          // ignore parse error
        }
        console.error(
          "[RefereeTableEdit] update referee error",
          errDetail || res.statusText
        );
        return;
      }

      let saved = null;
      try {
        saved = await res.json();
      } catch (_) {
        // some endpoints might return 204
      }
      const effective = saved || { ...selectedReferee, ...updatedData };

      if (typeof onEdit === "function") {
        onEdit(selectedReferee.id, effective);
      }

      handleCloseModal();
    } catch (err) {
      console.error("[RefereeTableEdit] update referee exception", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedReferee || !selectedReferee.id) {
      console.error("Aucun arbitre sélectionné pour suppression !");
      return;
    }

    const confirmDelete = window.confirm(
      t("confirmDeleteReferee", {
        defaultValue: "Are you sure you want to delete this referee?",
      })
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `/api/admin/tournaments/${id}/referees/${selectedReferee.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) {
        let errDetail = null;
        try {
          errDetail = await res.json();
        } catch (_) {
          // ignore parse error
        }
        console.error(
          "[RefereeTableEdit] delete referee error",
          errDetail || res.statusText
        );
        return;
      }

      if (typeof onDelete === "function") {
        onDelete(selectedReferee.id);
      }

      handleCloseModal();
    } catch (err) {
      console.error("[RefereeTableEdit] delete referee exception", err);
    }
  };

  return (
    <>
      {referees.length > 0 && (
        <div className="container mt-4">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>{t("nameRefereeTable")}</th>
                <th style={{ width: "40%" }}>{t("from")}</th>
                <th style={{ width: "20%" }}>{t("action")}</th>
              </tr>
            </thead>
            <tbody>
              {referees.map((referee) => (
                <tr key={referee.id}>
                  <td>
                    <Link
                      to={`/tournament/${id}/referees/${referee.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      {referee.lastname} {referee.firstname}
                    </Link>
                  </td>
                  <td>{referee.club?.name || "N/A"}</td>
                  <td>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleShowModal(referee)}
                    >
                      {t("edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal show" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t("editReferee")}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">{t("firstname")}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t("lastname")}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t("club")}</label>
                    <select
                      className="form-select"
                      value={club}
                      onChange={(e) => setClub(e.target.value)}
                    >
                      <option value="">{t("selectClub")}</option>
                      {Array.isArray(clubs) &&
                        clubs.map((clubItem) => (
                          <option key={clubItem.id} value={clubItem.id}>
                            {clubItem.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger mt-3" onClick={handleDelete}>
                  {t("delete")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary mt-3"
                  onClick={handleEdit}
                >
                  {t("saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RefereeTableEdit;
