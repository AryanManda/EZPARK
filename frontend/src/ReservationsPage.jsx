// src/ReservationsPage.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./dashboard.css";

const MOCK_RESERVATIONS = [
  { id: "RES-001", driver: "Marcus Webb",    spot: "A1", start: "Apr 19, 10:00 AM", end: "Apr 19, 12:00 PM", status: "Active" },
  { id: "RES-002", driver: "Priya Kapoor",   spot: "A3", start: "Apr 19, 3:30 PM",  end: "Apr 19,  5:00 PM", status: "Upcoming" },
  { id: "RES-003", driver: "Aisha Thompson", spot: "A6", start: "Apr 19, 4:00 PM",  end: "Apr 19,  6:00 PM", status: "Upcoming" },
  { id: "RES-004", driver: "Leo Nguyen",     spot: "B2", start: "Apr 18, 9:00 AM",  end: "Apr 18, 10:30 AM", status: "Completed" },
  { id: "RES-005", driver: "Derek Jones",    spot: "B5", start: "Apr 18, 2:00 PM",  end: "Apr 18,  3:00 PM", status: "Cancelled" },
];

const STATUS_COLORS = {
  Active:    { color: "#5ee3a0" },
  Upcoming:  { color: "#7dbfff" },
  Completed: { color: "var(--muted)" },
  Cancelled: { color: "#ff9c9c" },
};

export default function ReservationsPage() {
  const [view,   setView]   = useState("list");
  const [filter, setFilter] = useState("All");

  const STATUS_OPTS = ["All", "Active", "Upcoming", "Completed", "Cancelled"];

  const visible = MOCK_RESERVATIONS.filter(
    (r) => filter === "All" || r.status === filter
  );

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
      </nav>

      <div className="dash-content">
        <div className="page-header-row">
          <h2>Reservations</h2>
        </div>

        {/* View toggle */}
        <div className="tab-row">
          <button
            className={`tab-btn${view === "list" ? " active" : ""}`}
            onClick={() => setView("list")}
          >
            List View
          </button>
          <button
            className={`tab-btn${view === "calendar" ? " active" : ""}`}
            onClick={() => setView("calendar")}
          >
            Calendar View
          </button>
        </div>

        {/* Status filter */}
        <div className="toolbar-row">
          <label className="field-label" htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            style={{ width: "auto", flex: "none" }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {view === "list" ? (
          <div className="dash-card" style={{ padding: "0" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reservation ID</th>
                  <th>Driver Name</th>
                  <th>Spot Assigned</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length > 0 ? (
                  visible.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)", fontFamily: "monospace", fontSize: "0.82rem" }}>{r.id}</td>
                      <td style={{ color: "var(--text)" }}>{r.driver}</td>
                      <td style={{ color: "var(--gold-strong)", fontWeight: 600 }}>{r.spot}</td>
                      <td>{r.start}</td>
                      <td>{r.end}</td>
                      <td>
                        <span style={{ ...STATUS_COLORS[r.status], fontWeight: 600, fontSize: "0.82rem" }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}><span className="skeleton-cell" style={{ width: "70%" }} /></td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="calendar-placeholder">
            📅 &nbsp; Calendar view — coming soon
          </div>
        )}
      </div>
    </div>
  );
}
