import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import "./PlayerSelector.css";

/**
 * `PlayerSelector` Component
 * @component
 * @param {Object} props - Component props.
 * @param {Array<string>} props.groupTypes - List of unique player group types.
 * @param {string|null} props.selectedGroup - Currently selected player group.
 * @param {Function} props.onSelectGroup - Function to handle group selection.
 * @returns {JSX.Element} A horizontal scrollable list to filter players by group.
 */
const PlayerSelector = ({ groupTypes, selectedGroup, onSelectGroup }) => {
  const { t } = useTranslation();
  const scrollRef = useRef(null);

  if (groupTypes.length <= 1) {
    return null;
  }

  const handleSelectGroup = (group) => {
    if (selectedGroup === group) {
      onSelectGroup(null);
    } else {
      onSelectGroup(group);
    }
  };

  return (
    <div className="player-scroll-container">
      <div ref={scrollRef} className="player-scroll-view">
        {groupTypes.map((group) => (
          <button
            key={group}
            className={`btn btn-outline-primary ${
              selectedGroup === group ? "active" : ""
            }`}
            onClick={() => handleSelectGroup(group)}
          >
            {t(group)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlayerSelector;
