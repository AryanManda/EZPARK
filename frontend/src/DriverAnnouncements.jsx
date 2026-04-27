import { useEffect, useState } from "react";
import { getDriverAnnouncements } from "./api/parkingApi";

function DriverAnnouncements({ userId }) {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!userId) return;

    getDriverAnnouncements(userId)
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, [userId]);

  return (
    <>
      <h2>Announcements</h2>

      {announcements.length === 0 && <p>No announcements yet.</p>}

      {announcements.map((a) => (
        <div key={a.id} className="card">
          <p>{a.message}</p>
          <small>{new Date(a.createdAt).toLocaleString()}</small>
        </div>
      ))}
    </>
  );
}

export default DriverAnnouncements;