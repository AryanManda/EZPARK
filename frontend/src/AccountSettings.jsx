// src/AccountSettings.jsx
import React, { useState, useEffect } from "react";
import { addPaymentMethod, getPaymentMethods } from "./api/parkingApi";

function AccountSettings({ userId }) {
  const [form, setForm] = useState({ cardHolder: "", cardNumber: "", expiry: "" });
  const [saved, setSaved] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPaymentMethods(userId)
      .then((methods) => setSaved(methods))
      .catch(() => {});
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setStatus({ type: "", message: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (!form.cardHolder || !form.cardNumber || !form.expiry) {
      setStatus({ type: "error", message: "All fields are required." });
      return;
    }

    try {
      setLoading(true);
      const res = await addPaymentMethod({
        userId,
        cardHolder: form.cardHolder.trim(),
        cardNumber: form.cardNumber.replace(/\s/g, ""),
        expiry: form.expiry.trim(),
      });
      setStatus({ type: "success", message: res.message });
      setSaved((prev) => [...prev, res.method]);
      setForm({ cardHolder: "", cardNumber: "", expiry: "" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to save payment method.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="section-title">Account Settings</h2>
      <p className="section-help">Add a payment method to your account.</p>

      <form onSubmit={handleSubmit} className="form-vertical">
        <label className="field">
          <span className="field-label">Cardholder name *</span>
          <input
            className="input"
            name="cardHolder"
            value={form.cardHolder}
            onChange={handleChange}
            placeholder="Jane Doe"
          />
        </label>

        <label className="field">
          <span className="field-label">Card number *</span>
          <input
            className="input"
            name="cardNumber"
            value={form.cardNumber}
            onChange={handleChange}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
          />
        </label>

        <label className="field">
          <span className="field-label">Expiry (MM/YY) *</span>
          <input
            className="input"
            name="expiry"
            value={form.expiry}
            onChange={handleChange}
            placeholder="08/27"
            maxLength={5}
          />
        </label>

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Add Payment Method"}
        </button>
      </form>

      {status.message && (
        <div className={`alert ${status.type === "error" ? "error" : "success"}`}>
          {status.message}
        </div>
      )}

      {saved.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: "20px" }}>Saved Cards</h3>
          <div className="list">
            {saved.map((m) => (
              <article key={m.id} className="parking-card">
                <div className="card-header">
                  <h3>{m.masked}</h3>
                  <span className="chip">Expires {m.expiry}</span>
                </div>
                <p className="muted">{m.cardHolder}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default AccountSettings;
