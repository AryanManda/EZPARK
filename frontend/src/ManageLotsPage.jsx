// src/ManageLotsPage.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLot } from "./context/LotContext.jsx";
import "./dashboard.css";

export default function ManageLotsPage() {
  const { lots, activeLotId, setActiveLotId, addLot, deleteLot } = useLot();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formError, setFormError] = useState("");

  function handleSave() {
    if (!formName.trim()) { setFormError("Lot name is required."); return; }
    if (!formAddress.trim()) { setFormError("Address is required."); return; }
    addLot({ name: formName.trim(), address: formAddress.trim() });
    setFormName("");
    setFormAddress("");
    setFormError("");
    setShowForm(false);
  }

  function handleSwitch(id) {
    setActiveLotId(id);
    navigate("/owner/dashboard");
  }

  function handleDelete(id) {
    if (lots.length === 1) {
      alert("You must have at least one lot.");
      return;
    }
    if (!window.confirm("Delete this lot? This cannot be undone.")) return;
    deleteLot(id);
  }

  return (
    <div className="owner-layout">
      <nav className="sidebar" aria-label="Owner navigation">
        <p className="sidebar-title">Navigation</p>
        <NavLink to="/owner/dashboard"    className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">⊞</span> Dashboard
        </NavLink>
        <NavLink to="/owner/spots"        className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">🅿</span> Spots
        </NavLink>
        <NavLink to="/owner/reservations" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">📋</span> Reservations
        </NavLink>
        <NavLink to="/owner/financials"   className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">💰</span> Financials
        </NavLink>
        <NavLink to="/owner/manage-lots"  className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">🏢</span> Manage Lots
        </NavLink>
        <NavLink to="/owner/lot-settings" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">⚙</span> Lot Settings
        </NavLink>
      </nav>

      <div className="dash-content">
        <div className="page-header-row">
          <h2>Manage Lots</h2>
          {!showForm && (
            <button className="btn primary" onClick={() => setShowForm(true)}>
              + Add New Lot
            </button>
          )}
        </div>

        {/* Add New Lot form */}
        {showForm && (
          <div className="dash-card" style={{ marginBottom: "20px" }}>
            <h3 className="dash-card-title">New Lot</h3>
            <div className="form-vertical" style={{ maxWidth: "420px" }}>
              <div className="field">
                <label className="field-label" htmlFor="lot-name">Lot Name</label>
                <input
                  id="lot-name"
                  className="input"
                  type="text"
                  placeholder="e.g. Westside Garage"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="lot-addr">Address</label>
                <input
                  id="lot-addr"
                  className="input"
                  type="text"
                  placeholder="e.g. 456 West Blvd, Midtown"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>
              {formError && <div className="alert error">{formError}</div>}
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn primary" onClick={handleSave}>Save Lot</button>
                <button className="btn" onClick={() => { setShowForm(false); setFormError(""); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Lot cards */}
        <div className="lot-card-grid">
          {lots.map((lot) => (
            <div
              key={lot.id}
              className={`lot-card${lot.id === activeLotId ? " lot-card-active" : ""}`}
            >
              <div className="lot-card-header">
                <div>
                  <div className="lot-card-name">{lot.name}</div>
                  <div className="lot-card-address">{lot.address}</div>
                </div>
                {lot.id === activeLotId && (
                  <span className="chip chip-active" style={{ flexShrink: 0 }}>Active</span>
                )}
              </div>

              <div className="lot-card-stats">
                <div className="lot-stat">
                  <span className="lot-stat-value">{lot.spots.length}</span>
                  <span className="lot-stat-label">Spots</span>
                </div>
                <div className="lot-stat">
                  <span className="lot-stat-value">{lot.metrics.occupants}</span>
                  <span className="lot-stat-label">Occupied</span>
                </div>
                <div className="lot-stat">
                  <span className="lot-stat-value" style={{ color: "var(--gold-strong)" }}>
                    {lot.metrics.totalRevenue}
                  </span>
                  <span className="lot-stat-label">Revenue</span>
                </div>
              </div>

              <div className="lot-card-actions">
                {lot.id !== activeLotId && (
                  <button className="btn primary" style={{ padding: "6px 14px", fontSize: "0.82rem" }} onClick={() => handleSwitch(lot.id)}>
                    Switch to Lot
                  </button>
                )}
                <button
                  className="btn"
                  style={{ padding: "6px 10px", fontSize: "0.82rem", color: "var(--danger)", borderColor: "rgba(214,92,92,0.3)" }}
                  onClick={() => handleDelete(lot.id)}
                  aria-label={`Delete ${lot.name}`}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
