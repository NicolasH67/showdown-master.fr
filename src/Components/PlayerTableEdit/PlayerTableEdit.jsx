import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

const PlayerTableEdit = ({
  players,
  groupType,
  onDelete,
  onEdit,
  groups,
  clubs,
}) => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [club, setClub] = useState("");
  const [group, setGroup] = useState("");

  const handleShowModal = (player) => {
    setSelectedPlayer(player);
    setFirstname(player.firstname || "");
    setLastname(player.lastname || "");
    setClub(player.club?.id || "");
    setGroup(player.group?.id || "");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlayer(null);
  };

  const handleEdit = () => {
    if (!selectedPlayer || !selectedPlayer.id) {
      return;
    }

    const updatedData = {
      firstname,
      lastname,
      club_id: club,
      group_id: group,
    };

    onEdit(selectedPlayer.id, updatedData);
    handleCloseModal();
  };

  const handleDelete = () => {
    if (selectedPlayer && selectedPlayer.id) {
      onDelete(selectedPlayer.id);
      handleCloseModal();
    } else {
      return;
    }
  };

  const sortedPlayers = [...players].sort((a, b) => a.id - b.id);

  console.log(sortedPlayers);

  return (
    <>
      {sortedPlayers.length > 0 && (
        <div className="container mt-4">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>{t("namePlayerTable")}</th>
                <th style={{ width: "25%" }}>{t("from")}</th>
                <th style={{ width: "25%" }}>{t("group")}</th>
                <th style={{ width: "20%" }}>{t("action")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr key={player.id}>
                  <td>
                    <Link
                      to={`/tournament/${id}/players/${player.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      {player.firstname} {player.lastname}
                    </Link>
                  </td>
                  <td>{player.club?.name || "N/A"}</td>
                  <td>
                    {player.group
                      ? `${player.group.name} - ${t(player.group.group_type)}`
                      : "N/A"}
                  </td>
                  <td>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleShowModal(player)}
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
                <h5 className="modal-title">{t("editPlayer")}</h5>
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
                  <div className="mb-3">
                    <label className="form-label">{t("group")}</label>
                    <select
                      className="form-select"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} - {t(g.group_type)}
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

export default PlayerTableEdit;
