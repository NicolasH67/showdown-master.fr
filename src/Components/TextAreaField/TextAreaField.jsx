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
