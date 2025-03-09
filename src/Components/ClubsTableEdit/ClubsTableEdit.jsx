import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";

const ClubsTableEdit = ({ clubs, onDelete, onEdit }) => {
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(null);
  const [editedClub, setEditedClub] = useState({});

  const handleEditClick = (club) => {
    setEditMode(club.id);
    setEditedClub({ ...club });
  };

  const handleCancelEdit = () => {
    setEditMode(null);
    setEditedClub({});
  };

  const handleSaveEdit = () => {
    if (editedClub.name && editedClub.abbreviation) {
      onEdit(editedClub.id, editedClub);
      setEditMode(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedClub((prevClub) => ({
      ...prevClub,
      [name]: value,
    }));
  };

  return (
    <div>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>{t("clubName")}</th>
            <th>{t("abbreviation")}</th>
            <th>{t("action")}</th>
          </tr>
        </thead>
        <tbody>
          {clubs.length === 0 ? (
            <tr>
              <td colSpan="3">{t("noClubsAvailable")}</td>
            </tr>
          ) : (
            clubs.map((club) => (
              <tr key={club.id}>
                <td>
                  {editMode === club.id ? (
                    <input
                      type="text"
                      name="name"
                      value={editedClub.name}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  ) : (
                    club.name
                  )}
                </td>
                <td>
                  {editMode === club.id ? (
                    <input
                      type="text"
                      name="abbreviation"
                      value={editedClub.abbreviation}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  ) : (
                    club.abbreviation
                  )}
                </td>
                <td>
                  {editMode === club.id ? (
                    <>
                      <Button
                        label={t("saveChanges")}
                        onClick={handleSaveEdit}
                        className="btn btn-success btn-sm me-2"
                      />
                      <Button
                        label={t("cancel")}
                        onClick={handleCancelEdit}
                        className="btn btn-danger btn-sm"
                      />
                    </>
                  ) : (
                    <>
                      <Button
                        label={t("edit")}
                        onClick={() => handleEditClick(club)}
                        className="btn btn-warning btn-sm me-2"
                      />
                      <Button
                        label={t("delete")}
                        onClick={() => onDelete(club.id)}
                        className="btn btn-danger btn-sm"
                      />
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// Exportation par défaut
export default ClubsTableEdit;
