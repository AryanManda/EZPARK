import React, { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

function RegisterLot() {
  const [form, setForm] = useState({
    name: "",
    location: "",
    fullAddress: "",
    price: "",
    capacity: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setStatus({ type: "", message: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (!form.name.trim() || !form.location.trim() || !form.price) {
      setStatus({
        type: "error",
        message: "Lot name, location, and price are required.",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/register`, {
        name: form.name.trim(),
        location: form.location.trim(),
        fullAddress: form.fullAddress.trim(),
        price: Number(form.price),
        capacity: form.capacity ? Number(form.capacity) : 1,
      });

      setStatus({
        type: "success",
        message: res.data?.message || "Parking lot registered successfully.",
      });

      setForm({
        name: "",
        location: "",
        fullAddress: "",
        price: "",
        capacity: "",
      });
    } catch (err) {
      if (err.response) {
        setStatus({
          type: "error",
          message: err.response.data?.error || `Server error (${err.response.status}). Please try again.`,
        });
      } else if (err.request) {
        setStatus({
          type: "error",
          message: "Cannot reach the parking server. Is the backend running on port 5000?",
        });
      } else {
        setStatus({
          type: "error",
          message: "Unexpected error. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="section-title">Register Parking Lot</h2>
      <p className="section-help">
        Add your lot so drivers can search, book, and use it.
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
          <span className="field-label">Area / location *</span>
          <input
            className="input"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Downtown"
          />
        </label>

        <label className="field">
          <span className="field-label">Full address</span>
          <input
            className="input"
            name="fullAddress"
            value={form.fullAddress}
            onChange={handleChange}
            placeholder="123 Main Street"
          />
          <span className="field-hint">
            This helps drivers find the exact entrance.
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
            <span className="field-label">Capacity *</span>
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
          {loading ? "Registering..." : "Register Lot"}
        </button>
      </form>

      {status.message && (
        <div className={`alert ${status.type === "error" ? "error" : "success"}`}>
          {status.message}
        </div>
      )}
    </>
  );
}

export default RegisterLot;
