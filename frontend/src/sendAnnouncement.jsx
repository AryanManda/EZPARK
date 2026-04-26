import React, { useState } from "react";
import { useEffect } from "react";
import {
  getAnnouncementActiveCount,
  getOwnerLots,
  sendAnnouncementToLot,
} from "./api/parkingApi";

function SendAnnouncement({ ownerId }) {
  const [message, setMessage] = useState("");
  const [lots, setLots] = useState([]);
  const [lotId, setLotId] = useState("");
  const [activeParkersCount, setActiveParkersCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!ownerId) return;
    getOwnerLots(ownerId)
      .then((ownerLots) => {
        setLots(ownerLots || []);
        if (ownerLots?.length) {
          setLotId(String(ownerLots[0].id));
        }
      })
      .catch(() => {
        setStatus({ type: "error", message: "Unable to load owner lots." });
      });
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId || !lotId) {
      setActiveParkersCount(0);
      return;
    }

    setCountLoading(true);
    getAnnouncementActiveCount({ ownerId, lotId })
      .then((count) => setActiveParkersCount(count))
      .catch(() => setActiveParkersCount(0))
      .finally(() => setCountLoading(false));
  }, [ownerId, lotId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (!ownerId || !lotId || !message.trim()) {
      setStatus({ type: "error", message: "Select a lot and enter an announcement message." });
      return;
    }

    if (Number(activeParkersCount) <= 0) {
      setStatus({ type: "error", message: "No active parkers in this lot." });
      return;
    }

    try {
      setLoading(true);
      const response = await sendAnnouncementToLot({
        ownerId,
        lotId: Number(lotId),
        message: message.trim(),
      });

      setStatus({
        type: "success",
        message: `${response.message} Delivered to ${response.recipients} active parker(s).`,
      });
      setMessage("");

      const count = await getAnnouncementActiveCount({ ownerId, lotId });
      setActiveParkersCount(count);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to send announcement.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="section-title">Send Announcement</h2>
      <p className="section-help">
        Write a message to notify active parkers for your lot.
      </p>

      <form onSubmit={handleSubmit} className="form-vertical">
        <label className="field">
          <span className="field-label">Parking lot *</span>
          <select
            className="input"
            value={lotId}
            onChange={(e) => {
              setLotId(e.target.value);
              setStatus({ type: "", message: "" });
            }}
          >
            {lots.length === 0 && <option value="">No lots available</option>}
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Announcement message *</span>
          <textarea
            className="input"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setStatus({ type: "", message: "" });
            }}
            placeholder="Example: Lot closes at 10 PM tonight."
            rows={4}
          />
        </label>

        <label className="field">
          <span className="field-label">Active parkers count</span>
          <input
            className="input"
            type="number"
            min="0"
            value={activeParkersCount}
            readOnly
            placeholder="0"
          />
          {countLoading && <span className="field-hint">Refreshing active check-ins...</span>}
        </label>

        <button className="btn primary" type="submit" disabled={loading || !lotId}>
          {loading ? "Sending..." : "Send Announcement"}
        </button>
      </form>

      {status.message && (
        <div className={`alert ${status.type === "error" ? "error" : "success"}`}>
          {status.message}
        </div>
      )}
    </>
  );
}

export default SendAnnouncement;
