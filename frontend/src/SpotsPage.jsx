// src/SpotsPage.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLot } from "./context/LotContext.jsx";
import "./dashboard.css";

const VEHICLE_TYPES = ["Car", "Motorcycle", "EV", "All"];

const STATUS_STYLE = {
  available: { color: "#5ee3a0" },
  occupied:  { color: "#ff9c9c" },
  reserved:  { color: "#7dbfff" },
};

// ── Spot Edit Modal (FR-04 vehicle type, FR-05 time limit) ─
function SpotEditModal({ spot, onSave, onClose }) {
  const [vehicleType,      setVehicleType]      = useState(spot.vehicleType ?? "All");
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(spot.timeLimitMinutes != null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(spot.timeLimitMinutes ?? 60);

  function handleSave() {
    onSave({
      vehicleType,
      timeLimitMinutes: timeLimitEnabled ? Number(timeLimitMinutes) : null,
    });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="modal-panel" role="dialog" aria-modal="true" aria-label={`Edit Spot ${spot.id}`}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Spot {spot.id}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <hr className="modal-divider" />

        {/* FR-04: Vehicle Type */}
        <div style={{ marginBottom: "16px" }}>
          <p className="pricing-label" style={{ marginBottom: "8px" }}>Vehicle Type Allocation</p>
          <select
            className="input"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            style={{ width: "100%" }}
          >
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* FR-05: Time Limit */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <input
              type="checkbox"
              checked={timeLimitEnabled}
              onChange={(e) => setTimeLimitEnabled(e.target.checked)}
            />
            <span className="pricing-label" style={{ margin: 0 }}>Enable Time Limit</span>
          </label>
          {timeLimitEnabled && (
            <div>
              <p className="pricing-label">Limit (minutes)</p>
              <input
                className="input"
                type="number"
                min="5"
                step="5"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>

        <hr className="modal-divider" />

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn primary" onClick={handleSave} style={{ flex: 1 }}>Save Changes</button>
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        </div>
      </aside>
    </div>
  );
}

// ── Spots Page ────────────────────────────────────────────
export default function SpotsPage() {
  const { activeLot, activeLotId, updateSpot } = useLot();
  const [search,      setSearch]      = useState("");
  const [editingSpot, setEditingSpot] = useState(null);

  const spots = activeLot?.spots ?? [];

  const filtered = spots.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.vehicleType.toLowerCase().includes(search.toLowerCase()) ||
      s.status.toLowerCase().includes(search.toLowerCase())
  );

  function handleSave(changes) {
    updateSpot(activeLotId, editingSpot.id, changes);
    setEditingSpot(null);
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
      </nav>

      <div className="dash-content">
        <div className="page-header-row">
          <h2>Manage Spots — {activeLot?.name}</h2>
        </div>

        <div className="toolbar-row">
          <input
            className="input"
            type="text"
            placeholder="Search by ID, vehicle type, or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="dash-card" style={{ padding: "0" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Spot ID</th>
                <th>Vehicle Type</th>
                <th>Time Limit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((s) => {
                  const timeLimitLabel =
                    s.timeLimitMinutes == null ? "Unlimited"
                    : s.timeLimitMinutes >= 60 ? `${s.timeLimitMinutes / 60}h`
                    : `${s.timeLimitMinutes}m`;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)" }}>{s.id}</td>
                      <td>
                        <span className="chip" style={{ fontSize: "0.78rem" }}>{s.vehicleType}</span>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{timeLimitLabel}</td>
                      <td>
                        <span style={{ ...STATUS_STYLE[s.status], fontWeight: 600, fontSize: "0.85rem" }}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn"
                          style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                          onClick={() => setEditingSpot(s)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j}>
                        <span className="skeleton-cell" style={{ width: `${60 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingSpot && (
        <SpotEditModal
          spot={editingSpot}
          onSave={handleSave}
          onClose={() => setEditingSpot(null)}
        />
      )}
    </div>
  );
}

