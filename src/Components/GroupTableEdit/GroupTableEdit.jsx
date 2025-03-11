import React, { useState } from "react";
import supabase from "../../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";

const GroupTableEdit = ({ groups, players, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [roundType, setRoundType] = useState("");
  const [groupType, setGroupType] = useState("");
  const [highestPosition, setHighestPosition] = useState("");

  // Fonction pour afficher la modal avec les valeurs du groupe à modifier
  const handleEditClick = (group) => {
    setCurrentGroup(group);
    setGroupName(group.name);
    setRoundType(group.round_type);
    setGroupType(group.group_type);
    setHighestPosition(group.highest_position || "");
    setShowModal(true);
  };

  // Fonction pour soumettre la modification
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const updatedGroup = {
        name: groupName,
        round_type: roundType,
        group_type: groupType,
        highest_position:
          highestPosition === "" || highestPosition === null
            ? null
            : Number(highestPosition),
      };

      // Mise à jour du groupe dans la base de données
      const { data, error } = await supabase
        .from("group")
        .update(updatedGroup)
        .eq("id", currentGroup.id);

      if (error) {
        console.error("Erreur lors de la mise à jour du groupe :", error);
      } else {
        onEdit({ ...currentGroup, ...updatedGroup });
        setShowModal(false);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du groupe :", error);
    }
  };

  // Fonction pour supprimer le groupe
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("group")
        .delete()
        .eq("id", currentGroup.id);
      if (error) {
        console.error("Erreur lors de la suppression du groupe :", error);
      } else {
        onDelete(currentGroup.id);
        setShowModal(false);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du groupe :", error);
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
              <th>{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
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
                  <td>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleEditClick(group)}
                    >
                      Edit
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
                      Nom du Groupe
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
                      Type de Round
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
                      Type de Groupe
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
                      Highest Position
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="highestPosition"
                      value={highestPosition ?? ""}
                      onChange={(e) =>
                        setHighestPosition(
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Sauvegarder
                  </button>
                </form>

                {/* Bouton Supprimer dans la modal */}
                <button
                  className="btn btn-danger mt-3"
                  onClick={handleDelete} // Supprime le groupe
                >
                  Supprimer le groupe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GroupTableEdit;
