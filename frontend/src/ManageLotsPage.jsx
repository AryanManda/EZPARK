// src/ManageLotsPage.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLot } from "./context/LotContext.jsx";
import { deleteOwnerLot, getOwnerLots, registerParkingLot, updateOwnerLot } from "./api/parkingApi";
import "./dashboard.css";

const AUTH_STORAGE_KEY = "ezpark-auth-user";

function readOwnerIdFromSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.id || "owner-1";
  } catch {
    return "owner-1";
  }
}

export default function ManageLotsPage() {
  const { lots, lotsLoading, activeLotId, setActiveLotId, addLot, updateLot, deleteLot } = useLot();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [editingLotId, setEditingLotId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [formError, setFormError] = useState("");
  // Local cache of lat/lng keyed by backendLotId — LotContext doesn't carry coords
  const [coordsMap, setCoordsMap] = useState({});
  const [formPrice, setFormPrice] = useState("");
  const [formCapacity, setFormCapacity] = useState("");

  // Seed coordsMap from the server on mount so existing lot coords are shown correctly
  useEffect(() => {
    const ownerId = readOwnerIdFromSession();
    getOwnerLots(ownerId).then((apiLots) => {
      const map = {};
      apiLots.forEach((l) => {
        if (l.lat != null || l.lng != null) {
          map[l.id] = { lat: l.lat, lng: l.lng };
        }
      });
      setCoordsMap(map);
    }).catch(() => {});
  }, []);

  async function handleSave() {
    if (!formName.trim()) { setFormError("Lot name is required."); return; }
    if (!formAddress.trim()) { setFormError("Address is required."); return; }

  if (!formPrice || Number(formPrice) <= 0) {
    setFormError("Price must be greater than 0.");
    return;
  }

  if (!formCapacity || Number(formCapacity) < 1) {
    setFormError("Capacity must be at least 1.");
    return;
  }

    try {
      const parsedLat = formLat !== "" ? parseFloat(formLat) : null;
      const parsedLng = formLng !== "" ? parseFloat(formLng) : null;

      if (formLat !== "" && (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90)) {
        setFormError("Latitude must be between -90 and 90."); return;
      }
      if (formLng !== "" && (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180)) {
        setFormError("Longitude must be between -180 and 180."); return;
      }

      const ownerId = readOwnerIdFromSession();
      const payload = {
        ownerId,
        name: formName.trim(),
        location: formAddress.trim(),
        fullAddress: formAddress.trim(),
        price: Number(formPrice),
        capacity: Number(formCapacity),
        lat: parsedLat,
        lng: parsedLng,
      };

      if (editingLotId) {
        const response = await updateOwnerLot(editingLotId, payload);
        updateLot(response.lot);
        setCoordsMap((prev) => ({ ...prev, [editingLotId]: { lat: parsedLat, lng: parsedLng } }));
      } else {
        const response = await registerParkingLot(payload);
        addLot(response.lot);
        if (response.lot?.id) {
          setCoordsMap((prev) => ({ ...prev, [response.lot.id]: { lat: parsedLat, lng: parsedLng } }));
        }
      }

      setFormName("");
      setFormAddress("");
      setFormLat("");
      setFormLng("");
      setFormError("");
      setFormPrice("");
      setFormCapacity("");
      setShowForm(false);
      setEditingLotId(null);
    } catch (err) {
      setFormError(err.response?.data?.error || "Unable to save lot right now.");
    }
  }

  function openCreateForm() {
    setEditingLotId(null);
    setFormName("");
    setFormAddress("");
    setFormLat("");
    setFormLng("");
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(lot) {
    setEditingLotId(lot.backendLotId);
    setFormName(lot.name);
    setFormAddress(lot.address);
    setFormPrice(lot.price != null ? String(lot.price) : "");
    setFormCapacity(lot.capacity != null ? String(lot.capacity) : "");
    const cached = coordsMap[lot.backendLotId];
    const lat = cached?.lat ?? lot.lat;
    const lng = cached?.lng ?? lot.lng;
    setFormLat(lat != null ? String(lat) : "");
    setFormLng(lng != null ? String(lng) : "");
    setFormError("");
    setShowForm(true);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setFormError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(String(pos.coords.latitude.toFixed(6)));
        setFormLng(String(pos.coords.longitude.toFixed(6)));
        setGeoLoading(false);
      },
      () => {
        setFormError("Could not get your location. Please enter coordinates manually.");
        setGeoLoading(false);
      }
    );
  }

  function handleSwitch(id) {
    setActiveLotId(id);
    navigate("/owner/dashboard");
  }

  async function handleDelete(lot) {
    if (lots.length === 1) {
      alert("You must have at least one lot.");
      return;
    }
    if (!window.confirm("Delete this lot? This cannot be undone.")) return;

    try {
      await deleteOwnerLot(lot.backendLotId, readOwnerIdFromSession());
      deleteLot(lot.id);
    } catch (err) {
      alert(err.response?.data?.error || "Unable to delete lot right now.");
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
          <h2>Manage Lots</h2>
          {!showForm && (
            <button className="btn primary" onClick={openCreateForm}>
              + Add New Lot
            </button>
          )}
        </div>

        {/* Add New Lot form */}
        {showForm && (
          <div className="dash-card" style={{ marginBottom: "20px" }}>
            <h3 className="dash-card-title">{editingLotId ? "Edit Lot" : "New Lot"}</h3>
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

              <div className="field">
              <label className="field-label">Price per Hour ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 5"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">Number of Spots</label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="e.g. 20"
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
              />
            </div>

              <div className="field">
                <label className="field-label">
                  Coordinates <span className="muted" style={{ fontWeight: "normal" }}>(optional — enables distance sorting for drivers)</span>
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder="Latitude (e.g. 40.7128)"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    style={{ flex: 1, minWidth: "140px" }}
                  />
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder="Longitude (e.g. -74.0060)"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    style={{ flex: 1, minWidth: "140px" }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={handleUseMyLocation}
                    disabled={geoLoading}
                    style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}
                  >
                    {geoLoading ? "Locating..." : "📍 Use my location"}
                  </button>
                </div>
                {formLat && formLng && (
                  <p className="muted" style={{ marginTop: "4px", fontSize: "0.8rem" }}>
                    📍 {parseFloat(formLat).toFixed(5)}, {parseFloat(formLng).toFixed(5)}
                  </p>
                )}
              </div>

              {formError && <div className="alert error">{formError}</div>}
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn primary" onClick={handleSave}>{editingLotId ? "Update Lot" : "Save Lot"}</button>
                <button className="btn" onClick={() => { setShowForm(false); setEditingLotId(null); setFormLat(""); setFormLng(""); setFormError(""); setFormPrice("");
setFormCapacity("");}}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Lot cards */}
        <div className="lot-card-grid">
          {lotsLoading && lots.length === 0 && (
            <div className="dash-card">
              <p className="muted">Loading your lots...</p>
            </div>
          )}

          {lots.map((lot) => (
            <div
              key={lot.id}
              className={`lot-card${lot.id === activeLotId ? " lot-card-active" : ""}`}
            >
              <div className="lot-card-header">
                <div>
                  <div className="lot-card-name">{lot.name}</div>
                  <div className="lot-card-address">{lot.address}</div>
                  {(() => {
                    const cached = coordsMap[lot.backendLotId];
                    const lat = cached?.lat ?? lot.lat;
                    const lng = cached?.lng ?? lot.lng;
                    return lat != null && lng != null ? (
                      <div className="muted" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                        📍 {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                      </div>
                    ) : (
                      <div className="muted" style={{ fontSize: "0.75rem", marginTop: "2px", color: "var(--warning, #b07d2b)" }}>
                        ⚠ No coordinates — drivers won't see distance
                      </div>
                    );
                  })()}
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
                  style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                  onClick={() => openEditForm(lot)}
                >
                  Edit
                </button>
                <button
                  className="btn"
                  style={{ padding: "6px 10px", fontSize: "0.82rem", color: "var(--danger)", borderColor: "rgba(214,92,92,0.3)" }}
                  onClick={() => handleDelete(lot)}
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