// src/findParking.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { getCheckoutMessage } from "./useCaseLogic.js";

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

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/sessions/active?userId=${userId}`)
      .then((res) => setActiveSession(res.data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/payment-method?userId=${userId}`)
      .then((res) => setPaymentMethods(res.data || []))
      .catch(() => setPaymentMethods([]));
  }, [userId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);

    if (!location.trim()) {
      setError("Please enter a destination or area.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(
        `http://localhost:5000/api/parking?location=${encodeURIComponent(
          location.trim()
        )}`
      );
      const data = res.data || [];
      setResults(data);
      if (data.length === 0) {
        setError("No parking found for that location.");
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
      const res = await axios.post("http://localhost:5000/api/sessions/start", {
        userId,
        lotName: spot.name,
        hours: 1,
      });
      setActiveSession(res.data.session);
      setSessionStatus({ type: "success", message: `Booked ${spot.name} for 1 hour.` });
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
      const res = await axios.post("http://localhost:5000/api/sessions/extend", {
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

  const handleCheckout = () => {
    setSessionStatus({ type: "", message: "" });

    const isVehicleSelected = Boolean(activeSession);
    const isCheckedIn = Boolean(activeSession?.active);
    const hasPaymentMethod = paymentMethods.length > 0;

    const message = getCheckoutMessage(
      isVehicleSelected,
      isCheckedIn,
      hasPaymentMethod
    );

    setSessionStatus({
      type: message === "Check Out Sucessful!" ? "success" : "error",
      message,
    });

    if (message === "Check Out Sucessful!") {
      setActiveSession(null);
    }
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <h2 className="section-title">Find Nearby Parking</h2>
      <p className="section-help">
        Enter a destination like <strong>Downtown</strong> to see available spots.
      </p>

      {activeSession && (
        <div
          className="parking-card"
          style={{ marginBottom: "16px", background: "#f0fdf4", border: "1px solid #86efac" }}
        >
          <div className="card-header">
            <h3>Active Session: {activeSession.lotName}</h3>
            <span className="chip" style={{ background: "#22c55e", color: "#fff" }}>
              Active
            </span>
          </div>
          <p className="muted">
            Started: {formatTime(activeSession.startTime)}&nbsp;|&nbsp;Ends:{" "}
            {formatTime(activeSession.endTime)}
          </p>
          <form onSubmit={handleExtend} className="form-inline" style={{ marginTop: "10px" }}>
            <select
              className="input"
              value={extraHours}
              onChange={(e) => setExtraHours(e.target.value)}
              style={{ maxWidth: "120px" }}
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

      <form onSubmit={handleSearch} className="form-inline">
        <input
          type="text"
          className="input"
          placeholder="Destination or area"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

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

      {results.length > 0 && (
        <div className="list">
          {results.map((spot) => (
            <article
              key={spot.id ?? spot.name}
              className={`parking-card ${spot.available ? "" : "disabled"}`}
            >
              <div className="card-header">
                <h3>{spot.name}</h3>
                <span className="chip">${spot.price}/hr</span>
              </div>
              <p className="muted">Area: {spot.location}</p>
              <p>
                Status:{" "}
                <span className={spot.available ? "status-ok" : "status-bad"}>
                  {spot.available ? "Available" : "Full"}
                </span>
              </p>
              {spot.available && (
                <button
                  className="btn primary"
                  style={{ marginTop: "8px" }}
                  onClick={() => handleBook(spot)}
                  disabled={sessionLoading}
                >
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
