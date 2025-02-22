/**
 * A reusable textarea input component with label and value management.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.label - The label to display above the textarea.
 * @param {string} props.name - The name attribute for the textarea field.
 * @param {string} props.value - The value of the textarea, managed by parent component.
 * @param {Function} props.onChange - The function to call when the textarea value changes.
 *
 * @returns {JSX.Element} A JSX element representing the textarea input field.
 */
const TextAreaField = ({ label, name, value, onChange }) => (
  <div className="mb-3">
    <label className="form-label">{label}</label>
    <textarea
      className="form-control"
      name={name}
      value={value}
      onChange={onChange}
      required
    ></textarea>
  </div>
);

export default TextAreaField;
