// RegisterLot.jsx
import { useState } from "react";
import axios from "axios";

function RegisterLot() {
  const [form, setForm] = useState({
    name: "",
    location: "",
    price: "",
    capacity: ""
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setStatus({ type: "", message: "" });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (!form.name || !form.location || !form.price) {
      setStatus({
        type: "error",
        message: "Lot name, location, and price are required."
      });
      return;
    }

    try {
      setLoading(true);
      await axios.post("http://localhost:5000/api/register", {
        name: form.name.trim(),
        location: form.location.trim(),
        price: Number(form.price),
        capacity: form.capacity ? Number(form.capacity) : undefined
      });
      setStatus({
        type: "success",
        message: "Lot registered successfully. Waiting for admin approval."
      });
      setForm({ name: "", location: "", price: "", capacity: "" });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Something went wrong while registering your lot.";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Register Parking Lot</h2>
      <p className="section-help">
        For private owners. Provide basic info so drivers can find your lot.
      </p>

      <form onSubmit={handleSubmit} className="form-vertical">
        <label className="field">
          <span className="field-label">Lot name *</span>
          <input
            className="input"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="My Private Lot"
          />
        </label>

        <label className="field">
          <span className="field-label">Location / area *</span>
          <input
            className="input"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Downtown, City"
          />
          <span className="field-hint">
            Later you can replace this with a full address and map pin.
          </span>
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Price per hour (USD) *</span>
            <input
              className="input"
              type="number"
              min="1"
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="5"
            />
          </label>

          <label className="field">
            <span className="field-label">Capacity (optional)</span>
            <input
              className="input"
              type="number"
              min="1"
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              placeholder="20"
            />
          </label>
        </div>

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register lot"}
        </button>
      </form>

      {status.message && (
        <p
          className={
            status.type === "error" ? "text-error" : "text-success"
          }
        >
          {status.message}
        </p>
      )}
    </div>
  );
}

export default RegisterLot;