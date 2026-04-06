import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { getOwnerAnnouncementMessage } from "./useCaseLogic.js";

function SendAnnouncement() {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [activeParkersCount, setActiveParkersCount] = useState("0");
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = (e) => {
    e.preventDefault();

    const isAnnouncementTab = location.pathname === "/owner/announcements";
    const hasInput = Boolean(message.trim());
    const hasActiveParkers = Number(activeParkersCount) > 0;

    const responseMessage = getOwnerAnnouncementMessage(
      isAnnouncementTab,
      hasInput,
      hasActiveParkers
    );

    setStatus({
      type: responseMessage === "Announcement sent." ? "success" : "error",
      message: responseMessage,
    });

    if (responseMessage === "Announcement sent.") {
      setMessage("");
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
            onChange={(e) => {
              setActiveParkersCount(e.target.value);
              setStatus({ type: "", message: "" });
            }}
            placeholder="0"
          />
        </label>

        <button className="btn primary" type="submit">
          Send Announcement
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
