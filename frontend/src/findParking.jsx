import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

function FindParking({ userId }) {
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState({ type: "", message: "" });
  const [extraHours, setExtraHours] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("price-asc");

  const loadActiveSession = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions/active?userId=${userId}`);
      setActiveSession(res.data);
    } catch {
      setActiveSession(null);
    }
  }, [userId]);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/payment-method?userId=${userId}`);
      setPaymentMethods(res.data || []);
    } catch {
      setPaymentMethods([]);
    }
  }, [userId]);

  useEffect(() => {
    loadActiveSession();
    loadPaymentMethods();
  }, [loadActiveSession, loadPaymentMethods]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);

    if (!location.trim()) {
      setError("Please enter a destination, lot name, or area.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/parking?location=${encodeURIComponent(location.trim())}`
      );
      const data = Array.isArray(res.data) ? res.data : [];
      setResults(data);
      if (data.length === 0) {
        setError("No parking found for that search.");
      }
    } catch (err) {
      if (err.response) {
        setError(`Server error (${err.response.status}). Please try again later.`);
      } else if (err.request) {
        setError("Cannot reach the parking server. Is the backend running on port 5000?");
      } else {
        setError("Unexpected error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (spot) => {
    try {
      setSessionLoading(true);
      setSessionStatus({ type: "", message: "" });
      const res = await axios.post(`${API_BASE}/sessions/start`, {
        userId,
        lotName: spot.name,
        hours: 1,
      });
      setActiveSession(res.data.session);
      setSessionStatus({
        type: "success",
        message: `Booked ${spot.name} for 1 hour.`,
      });
      if (location.trim()) {
        const searchRes = await axios.get(
          `${API_BASE}/parking?location=${encodeURIComponent(location.trim())}`
        );
        setResults(searchRes.data || []);
      }
    } catch (err) {
      setSessionStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to book spot.",
      });
    } finally {
      setSessionLoading(false);
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    try {
      setSessionLoading(true);
      setSessionStatus({ type: "", message: "" });
      const res = await axios.post(`${API_BASE}/sessions/extend`, {
        userId,
        extraHours: Number(extraHours),
      });
      setActiveSession(res.data.session);
      setSessionStatus({ type: "success", message: res.data.message });
    } catch (err) {
      setSessionStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to extend session.",
      });
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setSessionLoading(true);
      setSessionStatus({ type: "", message: "" });

      const res = await axios.post(`${API_BASE}/sessions/checkout`, {
        userId,
      });

      setSessionStatus({ type: "success", message: res.data.message });
      setActiveSession(null);

      if (location.trim()) {
        const searchRes = await axios.get(
          `${API_BASE}/parking?location=${encodeURIComponent(location.trim())}`
        );
        setResults(searchRes.data || []);
      }
    } catch (err) {
      setSessionStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to check out.",
      });
    } finally {
      setSessionLoading(false);
    }
  };

  const visibleResults = useMemo(() => {
    let data = [...results];

    if (availableOnly) {
      data = data.filter((spot) => spot.available);
    }

    if (sortBy === "price-asc") {
      data.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      data.sort((a, b) => b.price - a.price);
    } else if (sortBy === "spots-desc") {
      data.sort((a, b) => (b.remainingSpots || 0) - (a.remainingSpots || 0));
    }

    return data;
  }, [results, availableOnly, sortBy]);

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <h2 className="section-title">Find Nearby Parking</h2>
      <p className="section-help">
        Search by area, address, or lot name to find available parking.
      </p>

      {activeSession && (
        <div className="parking-card active-session">
          <div className="card-header">
            <h3>Active Session: {activeSession.lotName}</h3>
            <span className="chip chip-active">Active</span>
          </div>
          <p className="muted">
            Started: {formatTime(activeSession.startTime)}&nbsp;|&nbsp;Ends: {formatTime(activeSession.endTime)}
          </p>
          <form onSubmit={handleExtend} className="form-inline session-actions">
            <select
              className="input"
              value={extraHours}
              onChange={(e) => setExtraHours(e.target.value)}
            >
              {[1, 2, 3, 4].map((h) => (
                <option key={h} value={h}>
                  {h} hr{h > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <button className="btn primary" type="submit" disabled={sessionLoading}>
              {sessionLoading ? "Extending..." : "Extend Time"}
            </button>
            <button className="btn" type="button" onClick={handleCheckout} disabled={sessionLoading}>
              Check Out
            </button>
          </form>
          {sessionStatus.message && (
            <div className={`alert ${sessionStatus.type === "error" ? "error" : "success"}`}>
              {sessionStatus.message}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSearch} className="form-inline search-bar">
        <input
          type="text"
          className="input"
          placeholder="Search Downtown, Main St, Lot A..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="filter-row">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
          />
          Available only
        </label>

        <select className="input filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="spots-desc">Most Spots</option>
        </select>
      </div>

      {paymentMethods.length === 0 && (
        <div className="alert error">
          Add a payment method before checkout.
        </div>
      )}

      {error && <div className="alert error">{error}</div>}

      {loading && (
        <div className="list-skeleton">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="muted">No parking found yet. Try searching a location.</p>
      )}

      {visibleResults.length > 0 && (
        <div className="list">
          {visibleResults.map((spot) => (
            <article key={spot.id ?? spot.name} className={`parking-card ${spot.available ? "" : "disabled"}`}>
              <div className="card-header">
                <h3>{spot.name}</h3>
                <span className="chip">${spot.price}/hr</span>
              </div>
              <p className="muted">Area: {spot.location}</p>
              <p className="muted">Address: {spot.fullAddress || "Not provided"}</p>
              <p className="muted">
                Spots Left: <strong>{spot.remainingSpots ?? "-"}</strong> / {spot.capacity ?? "-"}
              </p>
              <p>
                Status: <span className={spot.available ? "status-ok" : "status-bad"}>{spot.available ? "Available" : "Full"}</span>
              </p>
              {spot.available && !activeSession && (
                <button className="btn primary" onClick={() => handleBook(spot)} disabled={sessionLoading}>
                  Book (1 hr)
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default FindParking;
