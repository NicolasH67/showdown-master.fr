import React from "react";
import { useTranslation } from "react-i18next";

/**
 * `DateSelector` Component
 * @component
 * @param {Object} props - Component props.
 * @param {Array<string>} props.dates - List of unique match dates.
 * @param {string|null} props.selectedDate - Currently selected date.
 * @param {Function} props.onSelectDate - Function to handle date selection.
 * @returns {JSX.Element} A list of buttons to filter matches by date.
 */
const DateSelector = ({ dates, selectedDate, onSelectDate }) => {
  const { t } = useTranslation();

  if (dates.length === 1) {
    return null;
  }

  console.log(selectedDate === null ? "active" : "");

  return (
    <div className="d-flex justify-content-center mb-3">
      <button
        className={`btn btn-outline-primary mx-2 ${
          selectedDate === null ? "active" : ""
        }`}
        onClick={() => onSelectDate(null)}
      >
        {t("allDates")}
      </button>
      {dates.map((date) => (
        <button
          key={date}
          className={`btn btn-outline-primary mx-2 ${
            selectedDate === date ? "active" : ""
          }`}
          onClick={() => onSelectDate(date)}
        >
          {date}
        </button>
      ))}
    </div>
  );
};

export default DateSelector;
