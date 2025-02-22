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
const InputField = ({ label, type, name, value, onChange }) => (
  <div className="mb-3">
    <label className="form-label">{label}</label>
    <input
      className="form-control"
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required
    />
  </div>
);

export default InputField;
