import React from "react";

const Button = ({ label, onClick, active }) => (
  <button
    className={`btn ${active ? "btn-primary" : "btn-outline-primary"} mx-2`}
    onClick={onClick}
  >
    {label}
  </button>
);

export default Button;
