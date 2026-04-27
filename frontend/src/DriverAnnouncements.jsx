import React, { useEffect, useMemo, useState } from "react";
import { getDriverAnnouncements } from "./api/parkingApi";

function DriverAnnouncements({ userId, activeLotId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readIds, setReadIds] = useState([]);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setError("");

    getDriverAnnouncements(userId)
      .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setError("Unable to load lot updates."))
      .finally(() => setLoading(false));
  }, [userId]);

  const sortedAnnouncements = useMemo(() => {
    const items = [...announcements];
    items.sort((a, b) => {
      if (activeLotId && a.lotId === activeLotId && b.lotId !== activeLotId) return -1;
      if (activeLotId && b.lotId === activeLotId && a.lotId !== activeLotId) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return items;
  }, [announcements, activeLotId]);

  const unreadCount = sortedAnnouncements.filter((item) => !readIds.includes(item.id)).length;

  const markAllRead = () => {
    setReadIds(sortedAnnouncements.map((item) => item.id));
  };

  const markRead = (id) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const formatDate = (value) =>
    new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="announcement-panel">
      <div className="announcement-header">
        <div>
          <h3>Lot Updates</h3>
          <p className="muted">Messages from parking lot owners.</p>
        </div>

        <div className="announcement-actions">
          {unreadCount > 0 && <span className="chip chip-notification">{unreadCount} new</span>}
          {sortedAnnouncements.length > 0 && (
            <button className="btn btn-ghost" type="button" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading && <p className="muted">Loading updates...</p>}
      {error && <div className="alert error">{error}</div>}

      {!loading && !error && sortedAnnouncements.length === 0 && (
        <div className="announcement-empty">
          <p>No recent lot updates.</p>
        </div>
      )}

      {!loading && !error && sortedAnnouncements.length > 0 && (
        <div className="announcement-list">
          {sortedAnnouncements.map((item) => {
            const unread = !readIds.includes(item.id);
            const relatedToActiveLot = activeLotId && item.lotId === activeLotId;

            return (
              <article
                key={item.id}
                className={`announcement-card ${unread ? "unread" : ""} ${relatedToActiveLot ? "priority" : ""}`}
                onClick={() => markRead(item.id)}
              >
                <div className="announcement-icon" aria-hidden="true">
                  📢
                </div>

                <div className="announcement-body">
                  <div className="announcement-meta">
                    <span className="announcement-lot">
                      {relatedToActiveLot ? "Your current lot" : `Lot #${item.lotId}`}
                    </span>
                    <span className="announcement-time">{formatDate(item.createdAt)}</span>
                  </div>

                  <p className="announcement-message">{item.message}</p>

                  <div className="announcement-footer">
                    {relatedToActiveLot && <span className="chip chip-active">Current session</span>}
                    {unread && <span className="announcement-dot">Unread</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default DriverAnnouncements;