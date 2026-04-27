// src/SpotsPage.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLot } from "./context/LotContext.jsx";
import { addLotSpot, deleteLotSpots } from "./api/parkingApi.js";
import "./dashboard.css";

const VEHICLE_TYPES = ["Car", "Motorcycle", "EV", "All"];

const STATUS_STYLE = {
  available: { color: "#5ee3a0" },
  occupied:  { color: "#ff9c9c" },
  reserved:  { color: "#7dbfff" },
};

// ── Add Spot Modal ────────────────────────────────────────
function AddSpotModal({ onSave, onClose }) {
  const [spotId,      setSpotId]      = useState("");
  const [vehicleType, setVehicleType] = useState("All");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  async function handleSave() {
    if (!spotId.trim()) {
      setError("Spot ID is required.");
      return;
    }
    setLoading(true);
    try {
      await onSave({ spotId: spotId.trim(), vehicleType });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add spot.");
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="modal-panel" role="dialog" aria-modal="true" aria-label="Add New Spot">
        <div className="modal-header">
          <h2 className="modal-title">Add New Spot</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <hr className="modal-divider" />

        <div style={{ marginBottom: "16px" }}>
          <p className="pricing-label" style={{ marginBottom: "8px" }}>Spot ID</p>
          <input
            className="input"
            type="text"
            placeholder="e.g. A10"
            value={spotId}
            onChange={(e) => { setSpotId(e.target.value); setError(""); }}
            style={{ width: "100%" }}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <p className="pricing-label" style={{ marginBottom: "8px" }}>Vehicle Type</p>
          <select
            className="input"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            style={{ width: "100%" }}
          >
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {error && <div className="alert error">{error}</div>}

        <hr className="modal-divider" />

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
            {loading ? "Adding…" : "Add Spot"}
          </button>
          <button className="btn" onClick={onClose} disabled={loading} style={{ flex: 1 }}>Cancel</button>
        </div>
      </aside>
    </div>
  );
}

// ── Spot Edit Modal (FR-04 vehicle type, FR-05 time limit) ─
function SpotEditModal({ spot, onSave, onClose }) {
  const [status,           setStatus]           = useState(spot.status);
  const [vehicleType,      setVehicleType]      = useState(spot.vehicleType ?? "All");
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(spot.timeLimitMinutes != null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(spot.timeLimitMinutes ?? 60);
  const [overrideReason,   setOverrideReason]   = useState(spot.overrideReason ?? "");
  const [error,            setError]            = useState("");

  function handleSave() {
    if (spot.status === "occupied" && status === "reserved") {
      setError("Cannot reserve this spot because it is currently occupied.");
      return;
    }

    onSave({
      status,
      vehicleType,
      timeLimitMinutes: timeLimitEnabled ? Number(timeLimitMinutes) : null,
      overrideReason: overrideReason.trim() || null,
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

        <div style={{ marginBottom: "16px" }}>
          <p className="pricing-label" style={{ marginBottom: "8px" }}>Spot Status</p>
          <select
            className="input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setError("");
            }}
            style={{ width: "100%" }}
          >
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>

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

        <div style={{ marginBottom: "16px" }}>
          <p className="pricing-label">Override Note (optional)</p>
          <input
            className="input"
            type="text"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="e.g. Reserved for maintenance"
            style={{ width: "100%" }}
          />
        </div>

        {error && <div className="alert error">{error}</div>}

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
  const { activeLot, activeLotId, updateSpot, addSpot, removeSpots } = useLot();
  const [search,       setSearch]       = useState("");
  const [editingSpot,  setEditingSpot]  = useState(null);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [isAdding,     setIsAdding]     = useState(false);
  const [removeError,  setRemoveError]  = useState("");
  const [saving,       setSaving]       = useState(false);

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

  // Checkbox helpers
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((s) => next.delete(s.id));
      } else {
        filtered.forEach((s) => next.add(s.id));
      }
      return next;
    });
  }

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddSpot({ spotId, vehicleType }) {
    const created = await addLotSpot(activeLot.backendLotId, {
      ownerId: activeLot.ownerId,
      spotId,
      vehicleType,
    });
    addSpot(activeLotId, created);
    setIsAdding(false);
  }

  async function handleRemove() {
    const ids = Array.from(selectedIds);
    setRemoveError("");
    setSaving(true);
    try {
      await deleteLotSpots(activeLot.backendLotId, {
        ownerId: activeLot.ownerId,
        spotIds: ids,
      });
      removeSpots(activeLotId, ids);
      setSelectedIds(new Set());
    } catch (err) {
      setRemoveError(err.response?.data?.error || "Failed to remove spots.");
    } finally {
      setSaving(false);
    }
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
          <button
            className="btn primary"
            onClick={() => { setRemoveError(""); setIsAdding(true); }}
          >
            + Add New Spot
          </button>
          <button
            className="btn danger"
            disabled={selectedIds.size === 0 || saving}
            onClick={handleRemove}
          >
            − Remove Spot
          </button>
        </div>

        {removeError && (
          <div className="alert error" style={{ marginBottom: "12px" }}>{removeError}</div>
        )}

        <div className="dash-card" style={{ padding: "0" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    disabled={filtered.length === 0}
                    aria-label="Select all spots"
                  />
                </th>
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
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleOne(s.id)}
                          aria-label={`Select spot ${s.id}`}
                        />
                      </td>
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
                    {Array.from({ length: 6 }).map((__, j) => (
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

      {isAdding && (
        <AddSpotModal
          onSave={handleAddSpot}
          onClose={() => setIsAdding(false)}
        />
      )}
    </div>
  );
}

