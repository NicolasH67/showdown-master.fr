import { useState } from "react";
import supabase from "../../Helpers/supabaseClient";
import { useTranslation } from "react-i18next";

const GroupForm = ({ tournamentId, setGroups }) => {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState("");
  const [roundType, setRoundType] = useState(
    localStorage.getItem("lastRoundType") || "1st round"
  );
  const [groupType, setGroupType] = useState(
    localStorage.getItem("lastGroupType") || "mix"
  );
  const [highestPosition, setHighestPosition] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName) return;

    try {
      const { data, error } = await supabase.from("division").insert([
        {
          name: groupName,
          round_type: roundType,
          highest_position: highestPosition
            ? parseInt(highestPosition, 10)
            : null,
          group_type: groupType,
          tournament_id: tournamentId,
        },
      ]);

      if (error) throw error;
      setGroupName("");
      setHighestPosition("");
      setRoundType(localStorage.getItem("lastRoundType") || "1st round");
      setGroupType(localStorage.getItem("lastGroupType") || "mix");

      const { data: newGroups } = await supabase
        .from("division")
        .select("id, name, round_type, tournament_id, group_type")
        .eq("tournament_id", tournamentId);
      setGroups(newGroups);
    } catch (error) {
      console.error("Erreur lors de la création du groupe :", error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="container p-3 border rounded shadow-sm bg-light w-100"
    >
      <div className="row g-2 align-items-end">
        <div className="col">
          <label className="form-label">{t("nameGroup")}:</label>
          <input
            type="text"
            className="form-control"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </div>

        <div className="col">
          <label className="form-label">{t("roundType")}:</label>
          <select
            className="form-select"
            value={roundType}
            onChange={(e) => {
              setRoundType(e.target.value);
              localStorage.setItem("lastRoundType", e.target.value);
            }}
          >
            <option value="1st round">{t("firstRound")}</option>
            <option value="2nd round">{t("secondRound")}</option>
            <option value="final round">{t("finalRound")}</option>
          </select>
        </div>

        <div className="col">
          <label className="form-label">{t("groupType")}:</label>
          <select
            className="form-select"
            value={groupType}
            onChange={(e) => {
              setGroupType(e.target.value);
              localStorage.setItem("lastGroupType", e.target.value);
            }}
          >
            <option value="mix">{t("mix")}</option>
            <option value="women">{t("women")}</option>
            <option value="men">{t("men")}</option>
            <option value="team">{t("team")}</option>
          </select>
        </div>

        <div className="col">
          <label className="form-label">{t("highestPosition")}</label>
          <input
            type="number"
            className="form-control"
            value={highestPosition || ""}
            onChange={(e) => setHighestPosition(e.target.value)}
          />
        </div>

        <div className="col-auto">
          <button type="submit" className="btn btn-primary">
            {t("createGroup")}
          </button>
        </div>
      </div>
    </form>
  );
};

export default GroupForm;
