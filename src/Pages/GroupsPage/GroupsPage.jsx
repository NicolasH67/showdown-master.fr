import { useParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import useGroupsData from "../../Hooks/useGroupsData";
import RoundSelector from "../../Components/RoundSelector/RoundSelector";
import GroupsSection from "../../Components/GroupsSection/GroupsSection";
import { useTranslation } from "react-i18next";
import useMatches from "../../Hooks/useMatchs";
import supabase from "../../Helpers/supabaseClient";

const GroupsPage = () => {
  const { id } = useParams();
  const { matches } = useMatches();
  const { groups, players, loading, error } = useGroupsData(id);
  const [selectedRound, setSelectedRound] = useState("1st round");
  const { t } = useTranslation();

  const location = useLocation();

  const [allGroups, setAllgroups] = useState([]);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data: group, error: groupsError } = await supabase
        .from("group")
        .select("*")
        .eq("tournament_id", id);
      if (groupsError) {
        console.error(
          "Erreur de chargement des groupes :",
          groupsError.message
        );
      } else {
        setAllgroups(group);
      }
    };
    if (id) {
      fetchGroups();
    }
  }, [id]);

  useEffect(() => {
    if (groups.length > 0) {
      const title = document.getElementById("page-title");
      if (title) {
        title.focus();
      }
    }
  }, [location.pathname, groups.length]);

  if (loading)
    return <div className="text-center mt-3">{t("loadingGroups")}</div>;
  if (error) return <div className="alert alert-danger">{error.message}</div>;

  const filteredGroups = groups
    .filter((group) => group.round_type === selectedRound)
    .sort((a, b) => a.id - b.id);

  return (
    <div className="container mt-4">
      <h1 className="text-center" id="page-title" tabIndex="-1">
        {t("tournamentGroups")}
      </h1>
      <RoundSelector
        selectedRound={selectedRound}
        setSelectedRound={setSelectedRound}
      />
      {filteredGroups.length > 0 ? (
        <GroupsSection
          groups={filteredGroups}
          players={players}
          matches={matches}
          allGroups={allGroups}
        />
      ) : (
        <div className="alert alert-warning text-center">
          {t("noGroupsFound")}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
