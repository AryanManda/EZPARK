// src/LotSettingsPage.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLot } from "./context/LotContext.jsx";
import "./dashboard.css";

export default function LotSettingsPage() {
  const { activeLot, activeLotId, applyDefaultTimeLimit } = useLot();
  const [defaultLimit, setDefaultLimit] = useState(activeLot.defaultTimeLimitMinutes ?? 240);
  const [status, setStatus] = useState({ type: "", message: "" });

  function handleApply() {
    const res = applyDefaultTimeLimit(activeLotId, defaultLimit);
    if (!res.ok) {
      setStatus({ type: "error", message: res.error });
      return;
    }
    setStatus({
      type: "success",
      message: `Applied ${Number(defaultLimit)} minute default limit to unconfigured spots in ${activeLot.name}.`,
    });
  }

  return (
    <div className="owner-layout">
      <nav className="sidebar" aria-label="Owner navigation">
        <p className="sidebar-title">Navigation</p>
        <NavLink to="/owner/dashboard" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">⊞</span> Dashboard
        </NavLink>
        <NavLink to="/owner/spots" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">🅿</span> Spots
        </NavLink>
        <NavLink to="/owner/reservations" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">📋</span> Reservations
        </NavLink>
        <NavLink to="/owner/financials" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">💰</span> Financials
        </NavLink>
        <NavLink to="/owner/manage-lots" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">🏢</span> Manage Lots
        </NavLink>
        <NavLink to="/owner/lot-settings" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <span className="sidebar-icon">⚙</span> Lot Settings
        </NavLink>
      </nav>

      <div className="dash-content">
        <div className="page-header-row">
          <h2>Lot Settings — {activeLot.name}</h2>
        </div>

        <div className="dash-card" style={{ maxWidth: "560px" }}>
          <h3 className="dash-card-title">Global Default Time Limit</h3>
          <p className="muted" style={{ marginBottom: "14px" }}>
            Apply a default time limit to all spots that do not currently have a configured limit.
          </p>
          <div className="form-inline" style={{ marginBottom: "12px" }}>
            <input
              className="input"
              type="number"
              min="5"
              step="5"
              value={defaultLimit}
              onChange={(e) => {
                setDefaultLimit(e.target.value);
                setStatus({ type: "", message: "" });
              }}
            />
            <button className="btn primary" onClick={handleApply}>Apply to Unconfigured Spots</button>
          </div>
          {status.message && <div className={`alert ${status.type}`}>{status.message}</div>}
        </div>
      </div>
    </div>
  );
}
