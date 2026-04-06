// src/App.jsx
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import Login from "./Login.jsx";
import FindParking from "./findParking.jsx";
import RegisterLot from "./registerLot.jsx";
import AccountSettings from "./AccountSettings.jsx";
import SendAnnouncement from "./sendAnnouncement.jsx";

function ProtectedRoute({ user, allowedRole, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(null); // { role: 'driver' | 'owner', id: string }

  const handleLogout = () => setUser(null);

  return (
    <BrowserRouter>
      <div className="app-root">
        <header className="header">
          <h1 className="logo">Smart Parking</h1>
          <nav className="nav">
            {user?.role === "driver" && (
              <>
                <Link to="/driver/find-parking" className="nav-link">
                  Find Parking
                </Link>
                <Link to="/driver/account-settings" className="nav-link">
                  Account
                </Link>
              </>
            )}
            {user?.role === "owner" && (
              <>
                <Link to="/owner/register-lot" className="nav-link">
                  Register Lot
                </Link>
                <Link to="/owner/announcements" className="nav-link">
                  Announcements
                </Link>
              </>
            )}
            {user ? (
              <button className="btn small" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <Link to="/login" className="nav-link">
                Login
              </Link>
            )}
          </nav>
        </header>

        <main className="main-single">
          <Routes>
            <Route
              path="/login"
              element={<Login onLogin={setUser} user={user} />}
            />

            <Route
              path="/driver/find-parking"
              element={
                <ProtectedRoute user={user} allowedRole="driver">
                  <section className="panel">
                    <FindParking userId={user?.id} />
                  </section>
                </ProtectedRoute>
              }
            />

            <Route
              path="/driver/account-settings"
              element={
                <ProtectedRoute user={user} allowedRole="driver">
                  <section className="panel">
                    <AccountSettings userId={user?.id} />
                  </section>
                </ProtectedRoute>
              }
            />

            <Route
              path="/owner/register-lot"
              element={
                <ProtectedRoute user={user} allowedRole="owner">
                  <section className="panel">
                    <RegisterLot />
                  </section>
                </ProtectedRoute>
              }
            />

            <Route
              path="/owner/announcements"
              element={
                <ProtectedRoute user={user} allowedRole="owner">
                  <section className="panel">
                    <SendAnnouncement />
                  </section>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
