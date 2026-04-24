// src/OwnerDashboard.jsx
import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useLot } from "./context/LotContext.jsx";
import "./dashboard.css";

// ── Vehicle type badge helpers ────────────────────────────
const VTYPE_BADGE  = { Car: "C", Motorcycle: "M", EV: "E", All: "✦" };
const VTYPE_COLOR  = {
  Car:        "rgba(240,193,75,0.75)",
  Motorcycle: "rgba(255,156,156,0.75)",
  EV:         "rgba(125,191,255,0.75)",
  All:        "rgba(185,177,162,0.55)",
};
const PRICE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── SVG Sparkline (derived from baseRate) ─────────────────
function PriceChart({ baseRate }) {
  const points = [
    baseRate * 0.8, baseRate * 1.0, baseRate * 1.0,
    baseRate * 1.2, baseRate * 1.1, baseRate * 1.4, baseRate * 1.3,
  ];
  const W = 280, H = 90;
  const PAD = { top: 10, right: 8, bottom: 10, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const min = Math.min(...points) - 0.3;
  const max = Math.max(...points) + 0.3;
  const xOf = (i) => PAD.left + (i / (points.length - 1)) * innerW;
  const yOf = (v) => PAD.top + innerH - ((v - min) / (max - min)) * innerH;
  const pathD = points.map((v, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(" ");
  const areaD = pathD +
    ` L ${xOf(points.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)}` +
    ` L ${PAD.left.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;
  const yTicks = [min + 0.3, (min + max) / 2, max - 0.3];
  return (
    <div className="chart-wrapper">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#d4a017" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#d4a017" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={yOf(t).toFixed(1)} x2={W - PAD.right} y2={yOf(t).toFixed(1)}
              stroke="rgba(255,215,90,0.08)" strokeWidth="1" />
            <text x={PAD.left - 4} y={yOf(t) + 4} textAnchor="end" fontSize="8" fill="#928978">
              ${t.toFixed(1)}
            </text>
          </g>
        ))}
        <path d={areaD} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke="#d4a017" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((v, i) => (
          <circle key={i} cx={xOf(i)} cy={yOf(v)} r="3" fill="#f0c14b" stroke="#0b0b0c" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="chart-x-labels">{PRICE_DAYS.map((d) => <span key={d}>{d}</span>)}</div>
    </div>
  );
}

// ── Spot Detail Modal ─────────────────────────────────────
function SpotModal({ spot, onClose }) {
  if (!spot) return null;
  const timeLimitLabel =
    spot.timeLimitMinutes == null ? "Unlimited"
    : spot.timeLimitMinutes >= 60 ? `${spot.timeLimitMinutes / 60}h`
    : `${spot.timeLimitMinutes}m`;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="modal-panel" role="dialog" aria-modal="true" aria-label={`Spot ${spot.id} details`}>
        <div className="modal-header">
          <h2 className="modal-title">Spot {spot.id}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className={`modal-status-chip ${spot.status}`}>
            <span>{spot.status === "occupied" ? "🔴" : "🔵"}</span>
            {spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
          </span>
          <span className="chip" style={{ fontSize: "0.72rem" }}>{spot.vehicleType}</span>
        </div>
        <hr className="modal-divider" />
        <div className="modal-detail-row">
          <span className="modal-detail-label">Driver Name</span>
          <span className="modal-detail-value">{spot.driver ?? "—"}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Car Model</span>
          <span className="modal-detail-value">{spot.car ?? "—"}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">License Plate</span>
          <span className="modal-detail-value">{spot.plate ?? "—"}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Time Spent / Scheduled</span>
          <span className="modal-detail-value">{spot.time ?? "—"}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Time Limit</span>
          <span className="modal-detail-value">{timeLimitLabel}</span>
        </div>
        <hr className="modal-divider" />
        {spot.status !== "available" && (
          <button className="modal-msg-btn" onClick={() => alert(`Message sent to ${spot.driver} regarding spot ${spot.id}.`)}>
            ✉ Message Driver
          </button>
        )}
        {spot.status === "available" && (
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: 0 }}>This spot is currently available.</p>
        )}
      </aside>
    </div>
  );
}

// ── Owner Dashboard ───────────────────────────────────────
export default function OwnerDashboard() {
  const { activeLot } = useLot();
  const [selectedSpot, setSelectedSpot] = useState(null);
  const { metrics, spots, pricingRules } = activeLot;

  const overdueIds = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return new Set(
      spots
        .filter((s) => s.sessionStartIso && s.timeLimitMinutes != null &&
          (now - new Date(s.sessionStartIso).getTime()) / 60000 > s.timeLimitMinutes)
        .map((s) => s.id)
    );
  }, [spots]);
  const isOverdue = (spot) => overdueIds.has(spot.id);

  const METRIC_CARDS = [
    { label: "Total Revenue",   value: metrics.totalRevenue,          sub: "This month" },
    { label: "Occupants",       value: String(metrics.occupants),     sub: "Currently parked" },
    { label: "Reservations",    value: String(metrics.reservations),  sub: "Active bookings" },
    { label: "Available Spots", value: String(metrics.availableSpots),sub: "Open spots" },
  ];

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
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "22px" }}>
          <h1 className="dash-page-title" style={{ margin: 0 }}>Dashboard</h1>
          <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{activeLot.name}</span>
        </div>

        <div className="metrics-row">
          {METRIC_CARDS.map((m) => (
            <div className="metric-card" key={m.label}>
              <span className="metric-label">{m.label}</span>
              <span className="metric-value">{m.value}</span>
              <span className="metric-sub">{m.sub}</span>
            </div>
          ))}
        </div>

        <div className="dash-grid-row">
          <div className="dash-card">
            <h3 className="dash-card-title">Parking Lot — {activeLot.name}</h3>
            <div className="spot-grid">
              {spots.map((spot) => (
                <button
                  key={spot.id}
                  className={`spot ${spot.status}${isOverdue(spot) ? " overdue" : ""}`}
                  title={`${spot.id} · ${spot.vehicleType} · ${spot.status}${isOverdue(spot) ? " · overdue" : ""}`}
                  onClick={() => setSelectedSpot(spot)}
                  aria-label={`Spot ${spot.id}, ${spot.status}`}
                >
                  {spot.id}
                  <span className="spot-badge" style={{ color: VTYPE_COLOR[spot.vehicleType] }}>
                    {VTYPE_BADGE[spot.vehicleType]}
                  </span>
                </button>
              ))}
            </div>
            <div className="spot-legend">
              <div className="legend-item"><span className="legend-dot available" />Available</div>
              <div className="legend-item"><span className="legend-dot occupied"  />Occupied</div>
              <div className="legend-item"><span className="legend-dot reserved"  />Reserved</div>
              <div className="legend-item"><span className="legend-dot overdue"   />Overdue</div>
            </div>
          </div>

          <div className="dash-card">
            <h3 className="dash-card-title">Hourly Rate Trend (Base: ${pricingRules.baseRate}/hr)</h3>
            <PriceChart baseRate={pricingRules.baseRate} />
          </div>
        </div>
      </div>

      {selectedSpot && (
        <SpotModal spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
      )}
    </div>
  );
}
