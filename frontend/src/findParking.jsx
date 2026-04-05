// FindParking.jsx
import { useState } from "react";
import axios from "axios";

function FindParking() {
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async e => {
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
      setResults(res.data || []);
    } catch (err) {
      setError("Could not load parking spots. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Find Nearby Parking</h2>
      <p className="section-help">
        Enter a destination like <strong>Downtown</strong> to see available spots.
      </p>

      <form onSubmit={handleSearch} className="form-inline">
        <input
          type="text"
          className="input"
          placeholder="Destination or area"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-error">{error}</p>}

      {!loading && !error && results.length === 0 && (
        <p className="muted">No parking found yet. Try searching a location.</p>
      )}

      {loading && (
        <div className="list-skeleton">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {results.length > 0 && (
        <div className="list">
          {results.map(spot => (
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
              <button className="btn ghost" type="button">
                View details
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default FindParking;