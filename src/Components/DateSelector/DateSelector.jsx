import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import "./DateSelector.css";

/**
 * `DateSelector` Component
 * @component
 * @param {Object} props - Component props.
 * @param {Array<string>} props.dates - List of unique match dates.
 * @param {string|null} props.selectedDate - Currently selected date.
 * @param {Function} props.onSelectDate - Function to handle date selection.
 * @returns {JSX.Element} A horizontal scrollable list to filter matches by date.
 */
const DateSelector = ({ dates, selectedDate, onSelectDate }) => {
  const { t } = useTranslation();
  const scrollRef = useRef(null);

  if (dates.length <= 1) {
    return null;
  }

  return (
    <div className="date-scroll-container">
      <div ref={scrollRef} className="date-scroll-view">
        <button
          className={`btn btn-outline-primary ${
            selectedDate === null ? "active" : ""
          }`}
          onClick={() => onSelectDate(null)}
        >
          {t("allDates")}
        </button>
        {dates.map((date) => (
          <button
            key={date}
            className={`btn btn-outline-primary ${
              selectedDate === date ? "active" : ""
            }`}
            onClick={() => onSelectDate(date)}
          >
            {date}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateSelector;
