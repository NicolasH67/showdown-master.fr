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
  const API_BASE = import.meta.env.VITE_API_BASE || "";

  const handleShowModal = (player) => {
    setSelectedPlayer(player);
    setFirstname(player.firstname || "");
    setLastname(player.lastname || "");
    setClub(player.club?.id ? String(player.club.id) : "");
    const firstGroupId =
      Array.isArray(player.group_id) && player.group_id.length > 0
        ? String(player.group_id[0])
        : "";
    setGroup(firstGroupId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlayer(null);
  };

  const handleEdit = async () => {
    if (!selectedPlayer || !selectedPlayer.id) {
      return;
    }

    const parsedClubId = club === "" ? null : Number(club);
    const parsedGroupIdArray = group === "" ? [] : [Number(group)];

    const updatedData = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      club_id: parsedClubId,
      group_id: parsedGroupIdArray,
    };

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/tournaments/${id}/players/${selectedPlayer.id}`,
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
          "[PlayerTableEdit] update player error",
          errDetail || res.statusText
        );
        return;
      }

      let saved = null;
      try {
        saved = await res.json();
      } catch (_) {
        // some endpoints might return 204 No Content
      }
      const effective = saved || { ...selectedPlayer, ...updatedData };

      if (typeof onEdit === "function") {
        onEdit(selectedPlayer.id, effective);
      }

      handleCloseModal();
    } catch (err) {
      console.error("[PlayerTableEdit] update player exception", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlayer || !selectedPlayer.id) {
      return;
    }

    const confirmDelete = window.confirm(
      t("confirmDeletePlayer", {
        defaultValue: "Are you sure you want to delete this player?",
      })
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/tournaments/${id}/players/${selectedPlayer.id}`,
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
          "[PlayerTableEdit] delete player error",
          errDetail || res.statusText
        );
        return;
      }

      if (typeof onDelete === "function") {
        onDelete(selectedPlayer.id);
      }

      handleCloseModal();
    } catch (err) {
      console.error("[PlayerTableEdit] delete player exception", err);
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
                      {player.lastname} {player.firstname}
                    </Link>
                  </td>
                  <td>
                    <Link
                      to={`/tournament/${id}/provenance/${player.club?.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      {player.club?.name || "N/A"}
                    </Link>
                  </td>
                  <td>
                    {Array.isArray(player.group_id) &&
                    player.group_id.length > 0
                      ? (() => {
                          const g = groups.find(
                            (grp) => grp.id === player.group_id[0]
                          );
                          return g ? (
                            <Link
                              to={`/tournament/${id}/groups/${player.group_id[0]}`}
                              style={{ textDecoration: "none" }}
                            >
                              {g.name} - {t(g.group_type)}
                            </Link>
                          ) : (
                            "N/A"
                          );
                        })()
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
                          <option key={clubItem.id} value={String(clubItem.id)}>
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
                      <option value="">
                        {t("selectGroup", { defaultValue: "Select group" })}
                      </option>
                      {groups.map((g) => (
                        <option key={g.id} value={String(g.id)}>
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
