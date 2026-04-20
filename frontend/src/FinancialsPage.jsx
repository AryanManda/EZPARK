// src/FinancialsPage.jsx
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useLot } from "./context/LotContext.jsx";
import "./dashboard.css";

const MOCK_TRANSACTIONS = [
  { date: "Apr 19, 2026", driver: "Marcus Webb",    amount: "$5.00",  method: "Credit Card" },
  { date: "Apr 19, 2026", driver: "Leo Nguyen",     amount: "$4.50",  method: "Apple Pay"   },
  { date: "Apr 18, 2026", driver: "Sarah Kim",      amount: "$9.15",  method: "Credit Card" },
  { date: "Apr 18, 2026", driver: "Derek Jones",    amount: "$2.75",  method: "Google Pay"  },
  { date: "Apr 17, 2026", driver: "Omar Hassan",    amount: "$8.00",  method: "Credit Card" },
];

const DATE_RANGES = ["Last 7 Days", "This Month", "All Time"];
const VEHICLE_TYPES = ["Car", "Motorcycle", "EV"];

export default function FinancialsPage() {
  const { activeLot, activeLotId, updatePricingRules } = useLot();
  const [range, setRange] = useState("Last 7 Days");
  const [pricingOpen, setPricingOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  // Local editable state derived from activeLot
  const pr = activeLot.pricingRules;
  const [baseRate,            setBaseRate]            = useState(pr.baseRate);
  const [discountEnabled,     setDiscountEnabled]     = useState(pr.durationDiscountPercent > 0);
  const [discountAfterHours,  setDiscountAfterHours]  = useState(pr.durationDiscountAfterHours ?? 2);
  const [discountPercent,     setDiscountPercent]     = useState(pr.durationDiscountPercent ?? 10);
  const [dailyMaxEnabled,     setDailyMaxEnabled]     = useState(pr.dailyMaximum != null);
  const [dailyMaximum,        setDailyMaximum]        = useState(pr.dailyMaximum ?? 25);
  const [minimumEnabled,      setMinimumEnabled]      = useState(pr.minimumCharge != null);
  const [minimumCharge,       setMinimumCharge]       = useState(pr.minimumCharge ?? 10);
  const [vehicleMultipliers,  setVehicleMultipliers]  = useState({ ...pr.vehicleTypeMultipliers });

  // Effective rate calculator state
  const [calcVehicle, setCalcVehicle] = useState("Car");
  const [calcHours,   setCalcHours]   = useState(1);

  useEffect(() => {
    const next = activeLot.pricingRules;
    setBaseRate(next.baseRate);
    setDiscountEnabled(next.durationDiscountPercent > 0);
    setDiscountAfterHours(next.durationDiscountAfterHours ?? 2);
    setDiscountPercent(next.durationDiscountPercent ?? 10);
    setDailyMaxEnabled(next.dailyMaximum != null);
    setDailyMaximum(next.dailyMaximum ?? 25);
    setMinimumEnabled(next.minimumCharge != null);
    setMinimumCharge(next.minimumCharge ?? 10);
    setVehicleMultipliers({ ...next.vehicleTypeMultipliers });
  }, [activeLotId, activeLot]);

  function handleSaveRules() {
    updatePricingRules(activeLotId, {
      baseRate: Number(baseRate),
      durationDiscountAfterHours: Number(discountAfterHours),
      durationDiscountPercent: discountEnabled ? Number(discountPercent) : 0,
      dailyMaximum: dailyMaxEnabled ? Number(dailyMaximum) : null,
      minimumCharge: minimumEnabled ? Number(minimumCharge) : null,
      vehicleTypeMultipliers: {
        car:        Number(vehicleMultipliers.car),
        motorcycle: Number(vehicleMultipliers.motorcycle),
        ev:         Number(vehicleMultipliers.ev),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Effective rate calculation
  function computeEffectiveRate() {
    const hrs  = Number(calcHours);
    const rate = Number(baseRate);
    const vmul = vehicleMultipliers[calcVehicle.toLowerCase()] ?? 1;
    let total  = rate * vmul * hrs;
    if (discountEnabled && hrs > Number(discountAfterHours)) {
      total = total * (1 - Number(discountPercent) / 100);
    }
    if (dailyMaxEnabled) {
      total = Math.min(total, Number(dailyMaximum));
    }
    if (minimumEnabled) {
      total = Math.max(total, Number(minimumCharge));
    }
    return total.toFixed(2);
  }

  const SUB_METRICS = [
    { label: "Total Revenue",      value: activeLot.metrics.totalRevenue },
    { label: "Occupants",          value: String(activeLot.metrics.occupants) },
    { label: "Active Reservations",value: String(activeLot.metrics.reservations) },
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
        <div className="page-header-row">
          <h2>Financials — {activeLot.name}</h2>
        </div>

        {/* Sub-metric cards */}
        <div className="sub-metrics-row">
          {SUB_METRICS.map((m) => (
            <div className="sub-metric-card" key={m.label}>
              <div className="sub-metric-label">{m.label}</div>
              <div className="sub-metric-value">{m.value}</div>
            </div>
          ))}
        </div>

        {/* ── Pricing Rules (FR-06, FR-07) ── */}
        <div className="pricing-section">
          <div className="pricing-section-header" onClick={() => setPricingOpen((o) => !o)}>
            <span className="pricing-section-title">⚙ Pricing Rules</span>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
              {pricingOpen ? "Collapse ▲" : "Expand ▼"}
            </span>
          </div>

          {pricingOpen && (
            <>
              {saved && (
                <div className="alert success" style={{ marginTop: "12px" }}>
                  Pricing rules saved successfully.
                </div>
              )}

              {/* FR-06: Base rate + duration discount */}
              <div className="pricing-fields">
                <div>
                  <p className="pricing-label">Base Rate ($/hr)</p>
                  <input
                    className="input"
                    type="number"
                    min="0.5"
                    step="0.25"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                  />
                </div>
                <div>
                  <p className="pricing-label">Duration Discount</p>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="checkbox"
                      checked={discountEnabled}
                      onChange={(e) => setDiscountEnabled(e.target.checked)}
                    />
                    <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Enable</span>
                  </label>
                  {discountEnabled && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <p className="pricing-label">After (hours)</p>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          step="0.5"
                          value={discountAfterHours}
                          onChange={(e) => setDiscountAfterHours(e.target.value)}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className="pricing-label">Discount %</p>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          max="90"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FR-07: Vehicle type multipliers */}
              <div style={{ marginTop: "16px" }}>
                <p className="pricing-label" style={{ marginBottom: "10px" }}>Vehicle Type Multipliers</p>
                <div className="pricing-fields">
                  {VEHICLE_TYPES.map((vt) => (
                    <div key={vt}>
                      <p className="pricing-label">{vt}</p>
                      <input
                        className="input"
                        type="number"
                        min="0.1"
                        step="0.05"
                        value={vehicleMultipliers[vt.toLowerCase()]}
                        onChange={(e) =>
                          setVehicleMultipliers((prev) => ({
                            ...prev,
                            [vt.toLowerCase()]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <p className="pricing-label" style={{ marginBottom: "10px" }}>Advanced Charge Rules</p>
                <div className="pricing-fields">
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <input
                        type="checkbox"
                        checked={dailyMaxEnabled}
                        onChange={(e) => setDailyMaxEnabled(e.target.checked)}
                      />
                      <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Enable Daily Maximum</span>
                    </label>
                    {dailyMaxEnabled && (
                      <>
                        <p className="pricing-label">Daily Max ($)</p>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          step="0.5"
                          value={dailyMaximum}
                          onChange={(e) => setDailyMaximum(e.target.value)}
                        />
                      </>
                    )}
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <input
                        type="checkbox"
                        checked={minimumEnabled}
                        onChange={(e) => setMinimumEnabled(e.target.checked)}
                      />
                      <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Enable Minimum Charge</span>
                    </label>
                    {minimumEnabled && (
                      <>
                        <p className="pricing-label">Minimum Charge ($)</p>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          step="0.5"
                          value={minimumCharge}
                          onChange={(e) => setMinimumCharge(e.target.value)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Effective rate calculator */}
              <div className="effective-rate-box">
                <p className="pricing-label">Effective Rate Calculator</p>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div>
                    <p className="pricing-label">Vehicle</p>
                    <select
                      className="input"
                      value={calcVehicle}
                      onChange={(e) => setCalcVehicle(e.target.value)}
                    >
                      {VEHICLE_TYPES.map((vt) => <option key={vt}>{vt}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="pricing-label">Hours</p>
                    <input
                      className="input"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={calcHours}
                      onChange={(e) => setCalcHours(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="pricing-label">Total Cost</p>
                    <div className="effective-rate-display">${computeEffectiveRate()}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <button className="btn primary" onClick={handleSaveRules}>Save Rules</button>
              </div>
            </>
          )}
        </div>

        {/* Date range picker */}
        <div className="date-range-row">
          {DATE_RANGES.map((r) => (
            <button
              key={r}
              className={`date-range-btn${range === r ? " active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Recent Transactions table */}
        <h3 className="dash-card-title" style={{ marginBottom: "10px" }}>Recent Transactions</h3>
        <div className="dash-card" style={{ padding: "0" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver</th>
                <th>Amount</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRANSACTIONS.map((t, i) => (
                <tr key={i}>
                  <td>{t.date}</td>
                  <td style={{ color: "var(--text)" }}>{t.driver}</td>
                  <td style={{ color: "#5ee3a0", fontWeight: 600 }}>{t.amount}</td>
                  <td>
                    <span className="chip">{t.method}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

