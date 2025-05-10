import { useState } from "react";
import supabase from "../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";

const useEntityActions = () => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const onDelete = async (entity, entityId) => {
    try {
      const { error } = await supabase.from(entity).delete().eq("id", entityId);

      if (error) {
        console.error(
          `Erreur lors de la suppression de ${entity} :`,
          error.message
        );
        setError(error.message);
      } else {
        console.log(`${entity} supprimé avec succès, ID :`, entityId);
        setSuccessMessage(t("entityDeleted", { entity }));
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
      setError(t("unexpectedError"));
    }
  };

  const onEdit = async (entity, entityId, updatedData) => {
    try {
      const { error } = await supabase
        .from(entity)
        .update(updatedData)
        .eq("id", entityId);

      if (error) {
        console.error(
          `Erreur lors de la modification de ${entity} :`,
          error.message
        );
        setError(error.message);
      } else {
        console.log(
          `${entity} modifié avec succès, ID :`,
          entityId,
          updatedData
        );
        setSuccessMessage(`${entity} modifié avec succès`);
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
      setError(t("unexpectedError"));
    }
  };

  return {
    onDelete,
    onEdit,
    error,
    successMessage,
  };
};

export default useEntityActions;
