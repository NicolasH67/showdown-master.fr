import React from "react";
import Button from "../Button/Button";
import { useTranslation } from "react-i18next";

const RoundSelector = ({ selectedRound, setSelectedRound }) => {
  const { t } = useTranslation();

  return (
    <div className="d-flex justify-content-center my-3">
      <Button
        label={t("firstRound")}
        onClick={() => setSelectedRound("1st round")}
        active={selectedRound === "1st round"}
      />
      <Button
        label={t("secondRound")}
        onClick={() => setSelectedRound("2nd round")}
        active={selectedRound === "2nd round"}
      />
      <Button
        label={t("finalRound")}
        onClick={() => setSelectedRound("final round")}
        active={selectedRound === "final round"}
      />
    </div>
  );
};

export default RoundSelector;
