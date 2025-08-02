import { useState } from "react";

/**
 * A reusable input field component with label, value, and change handler.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.label - The label to display for the input field.
 * @param {string} props.type - The type of the input field (e.g., "text", "password").
 * @param {string} props.name - The name attribute for the input field.
 * @param {string} props.value - The value of the input field, controlled by the parent component.
 * @param {Function} props.onChange - The function to call when the input value changes.
 *
 * @returns {JSX.Element} A JSX element representing the input field with a label.
 */
const InputField = ({ label, type, name, value, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <div className="input-group">
        <input
          className="form-control"
          type={isPassword && showPassword ? "text" : type}
          name={name}
          value={value}
          onChange={onChange}
          required
          pattern={
            type === "email"
              ? "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
              : undefined
          }
          maxLength={255}
        />
        {isPassword && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
