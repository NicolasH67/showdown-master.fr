import React, { useState } from "react";
import supabase from "../../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";
import { X, Plus, Trash2 } from "lucide-react";

const GroupTableEdit = ({ groups, players, onEdit, onDelete, allGroups }) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [roundType, setRoundType] = useState("");
  const [groupType, setGroupType] = useState("");
  const [highestPosition, setHighestPosition] = useState("");
  const [groupFormer, setGroupFormer] = useState([]);

  const sortedGroups = [...groups].sort((a, b) => a.id - b.id);

  const handleEditClick = (group) => {
    setCurrentGroup(group);
    setGroupName(group.name);
    setRoundType(group.round_type);
    setGroupType(group.group_type);
    setHighestPosition(group.highest_position || "");

    let parsedGroupFormer = [];
    if (group.group_former) {
      try {
        parsedGroupFormer = Array.isArray(group.group_former)
          ? group.group_former
          : JSON.parse(group.group_former);
      } catch (error) {
        console.error(t("groupFormerError"), error);
        parsedGroupFormer = [];
      }
    }
    setGroupFormer(parsedGroupFormer);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const updatedGroup = {
        name: groupName,
        round_type: roundType,
        group_type: groupType,
        highest_position:
          highestPosition === "" ? null : Number(highestPosition),
        group_former:
          roundType === "2nd round" || roundType === "final round"
            ? groupFormer.length > 0
              ? JSON.stringify(groupFormer)
              : null
            : null,
      };

      const { error } = await supabase
        .from("group")
        .update(updatedGroup)
        .eq("id", currentGroup.id);

      if (error) {
        console.error(t("groupUpdateError"), error);
      } else {
        onEdit({ ...currentGroup, ...updatedGroup });
        setShowModal(false);
      }
    } catch (error) {
      console.error(t("groupUpdateError"), error);
    }
  };

  const handleDelete = async () => {
    if (!currentGroup) return;

    const confirmDelete = window.confirm(
      `${t("confireDeleteGroupe")} ${currentGroup.name} ?`
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("group")
        .delete()
        .eq("id", currentGroup.id);

      if (error) {
        console.error(t("deleteGroupError"), error);
      } else {
        onDelete(currentGroup.id);
        setShowModal(false);
      }
    } catch (error) {
      console.error(t("deleteGroupError"), error);
    }
  };

  return (
    <section className="p-4">
      <div className="overflow-auto max-h-[500px] border rounded-lg shadow-md">
        <table className="table table-striped min-w-full">
          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              <th>{t("nameGroup")}</th>
              <th>{t("playerCount")}</th>
              <th>{t("roundType")}</th>
              <th>{t("groupType")}</th>
              <th>{t("highestPosition")}</th>
              {sortedGroups.some(
                (group) =>
                  group.round_type === "2nd round" ||
                  group.round_type === "final round"
              ) && <th>{t("groupFormer")}</th>}
              <th>{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map((group) => {
              const playerCount = players.filter(
                (player) => player.group.id === group.id
              ).length;

              return (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>{playerCount}</td>
                  <td>{group.round_type}</td>
                  <td>{group.group_type}</td>
                  <td>{group.highest_position || "N/A"}</td>
                  {(group.round_type === "2nd round" ||
                    group.round_type === "final round") && (
                    <td>
                      {groups.length > 0 && group.group_former
                        ? (() => {
                            try {
                              const parsedGroupFormer = Array.isArray(
                                group.group_former
                              )
                                ? group.group_former
                                : JSON.parse(group.group_former);

                              return parsedGroupFormer
                                .map(([position, groupId]) => {
                                  const foundGroup = allGroups.find(
                                    (g) => g.id === Number(groupId)
                                  );
                                  return foundGroup
                                    ? `${foundGroup.name}(${position})`
                                    : `Groupe inconnu (${position})`;
                                })
                                .join(", ");
                            } catch (error) {
                              console.error(t("groupFormerError"), error);
                              return t("groupFormerError");
                            }
                          })()
                        : "N/A"}
                    </td>
                  )}
                  <td>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleEditClick(group)}
                    >
                      {t("edit")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal pour éditer un groupe */}
      {showModal && (
        <div className="modal show" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Modifier le groupe</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="groupName" className="form-label">
                      {t("nameGroup")}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="groupName"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="roundType" className="form-label">
                      {t("roundType")}
                    </label>
                    <select
                      id="roundType"
                      className="form-select"
                      value={roundType}
                      onChange={(e) => setRoundType(e.target.value)}
                      required
                    >
                      <option value="1st round">1st round</option>
                      <option value="2nd round">2nd round</option>
                      <option value="final round">Final round</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="groupType" className="form-label">
                      {t("roundType")}
                    </label>
                    <select
                      id="groupType"
                      className="form-select"
                      value={groupType}
                      onChange={(e) => setGroupType(e.target.value)}
                      required
                    >
                      <option value="mix">Mix</option>
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                      <option value="team">Team</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="highestPosition" className="form-label">
                      {t("highestPositionNonOptional")}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="highestPosition"
                      value={highestPosition}
                      onChange={(e) => setHighestPosition(e.target.value)}
                    />
                  </div>

                  {(roundType === "2nd round" ||
                    roundType === "final round") && (
                    <div className="mb-3">
                      <label className="form-label">Ancien Groupe</label>
                      {groupFormer.map((entry, index) => (
                        <div
                          key={index}
                          className="d-flex align-items-center mb-2"
                        >
                          <input
                            type="number"
                            className="form-control me-2"
                            placeholder="Position"
                            value={entry[0]}
                            onChange={(e) => {
                              const newEntries = [...groupFormer];
                              newEntries[index][0] = Number(e.target.value);
                              setGroupFormer(newEntries);
                            }}
                          />
                          <select
                            className="form-select me-2"
                            value={entry[1]}
                            onChange={(e) => {
                              const newEntries = [...groupFormer];
                              newEntries[index][1] = Number(e.target.value);
                              setGroupFormer(newEntries);
                            }}
                          >
                            <option value="">Sélectionner un groupe</option>
                            {allGroups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.name} - {group.group_type}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                              setGroupFormer(
                                groupFormer.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            <X size={20} color="white" />
                          </button>
                          ;
                        </div>
                      ))}
                      <br />
                      <button
                        type="button"
                        className="btn btn-secondary mt-2 d-flex align-items-center"
                        onClick={() =>
                          setGroupFormer([...groupFormer, [1, ""]])
                        }
                      >
                        <Plus size={20} className="me-2" /> {t("addPosition")}
                      </button>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary">
                    {t("saveChanges")}
                  </button>
                  <br />
                  <button
                    type="button"
                    className="btn btn-danger d-flex align-items-center"
                    onClick={handleDelete}
                  >
                    <Trash2 size={20} className="me-2" /> {t("deleteGroup")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GroupTableEdit;
