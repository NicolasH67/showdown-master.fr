import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
// We reuse DateSelector styles to avoid duplicating CSS
import "../DateSelector/DateSelector.css";

/**
 * `TableSelector` Component
 * @component
 * @param {Object} props - Component props.
 * @param {number} props.tables - Number of tables available.
 * @param {string|number|null} props.selectedTable - Currently selected table.
 * @param {Function} props.onSelectTable - Function to handle table selection.
 * @returns {JSX.Element|null} A horizontal scrollable list to filter matches by table.
 */
const TableSelector = ({ tables, selectedTable = null, onSelectTable }) => {
  const { t } = useTranslation();
  const scrollRef = useRef(null);

  if (typeof tables !== "number" || tables <= 1) {
    return null;
  }

  return (
    <div className="date-scroll-container">
      <div ref={scrollRef} className="date-scroll-view">
        <button
          type="button"
          className={`btn btn-outline-primary ${
            selectedTable === null || selectedTable === undefined
              ? "active"
              : ""
          }`}
          onClick={() => onSelectTable?.(null)}
        >
          {t("allTables")}
        </button>
        {Array.from({ length: tables }, (_, i) => i + 1).map((tableNumber) => {
          const isActive = selectedTable === tableNumber;
          return (
            <button
              type="button"
              key={tableNumber}
              className={`btn btn-outline-primary ${isActive ? "active" : ""}`}
              onClick={() => onSelectTable?.(tableNumber)}
            >
              {t("table")} {tableNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TableSelector;
