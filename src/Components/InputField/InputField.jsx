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
