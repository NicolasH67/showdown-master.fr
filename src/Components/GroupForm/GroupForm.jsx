import { useState } from "react";
import { get, post } from "../../Helpers/apiClient";
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
    const name = String(groupName).trim();
    if (!name) return;

    const idNum = Number(tournamentId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      console.error(
        "Invalid tournamentId provided to GroupForm:",
        tournamentId
      );
      return;
    }

    const payload = {
      name,
      round_type: roundType,
      highest_position:
        highestPosition === "" || highestPosition === null
          ? null
          : parseInt(highestPosition, 10),
      group_type: groupType,
      tournament_id: idNum,
    };

    try {
      // 1) Create group via backend (uses service role on server)
      // Prefer the REST-unified route on Vercel
      let created = false;
      const candidates = [
        // serverless unified handler (recommended)
        `/api/tournaments/${idNum}/groups`,
        // monolith dev server (if mounted under same origin)
        `/api/tournaments/${idNum}/groups`,
      ];

      let lastErr = null;
      for (const url of candidates) {
        try {
          const res = await post(url, payload);
          // if backend returns representation, consider created
          if (res) {
            created = true;
            break;
          }
        } catch (err) {
          lastErr = err;
          continue;
        }
      }

      if (!created) {
        // As a safety, report the last error (avoids silent failure)
        throw lastErr || new Error("create_group_failed");
      }

      // 2) Refetch groups for the tournament (GET)
      const groupsPaths = [
        `/api/tournaments/${idNum}/groups`,
        `/api/tournaments/${idNum}/groups`,
      ];
      let newGroups = [];
      let fetched = false;
      for (const url of groupsPaths) {
        try {
          const data = await get(url);
          if (Array.isArray(data)) {
            newGroups = data;
          } else if (Array.isArray(data?.groups)) {
            newGroups = data.groups;
          }
          fetched = true;
          break;
        } catch (_) {
          // try next variant
        }
      }
      if (!fetched) {
        console.warn("[GroupForm] Unable to refresh groups list");
      } else {
        setGroups(newGroups);
      }

      // 3) Reset UI state
      setGroupName("");
      setHighestPosition("");
      setRoundType(localStorage.getItem("lastRoundType") || "1st round");
      setGroupType(localStorage.getItem("lastGroupType") || "mix");
    } catch (error) {
      console.error("Erreur lors de la création du groupe :", error);
      alert("Erreur lors de la création du groupe.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="container p-3 border rounded shadow-sm bg-light w-100"
    >
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md">
          <label className="form-label">{t("nameGroup")}:</label>
          <input
            type="text"
            className="form-control"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </div>

        <div className="col-12 col-md">
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

        <div className="col-12 col-md">
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

        <div className="col-12 col-md">
          <label className="form-label">{t("highestPosition")}</label>
          <input
            type="number"
            className="form-control"
            value={highestPosition || ""}
            onChange={(e) => setHighestPosition(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-auto d-flex justify-content-md-end">
          <button type="submit" className="btn btn-primary w-100 w-md-auto">
            {t("createGroup")}
          </button>
        </div>
      </div>
    </form>
  );
};

export default GroupForm;
