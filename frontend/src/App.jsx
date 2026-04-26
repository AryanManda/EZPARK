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
import Vehicles from "./Vehicles.jsx";
import OwnerDashboard from "./OwnerDashboard.jsx";
import SpotsPage from "./SpotsPage.jsx";
import ReservationsPage from "./ReservationsPage.jsx";
import FinancialsPage from "./FinancialsPage.jsx";
import ManageLotsPage from "./ManageLotsPage.jsx";
import LotSettingsPage from "./LotSettingsPage.jsx";
import { LotProvider, useLot } from "./context/LotContext.jsx";

function FinancialsRoute() {
  const { activeLotId } = useLot();
  return <FinancialsPage key={activeLotId} />;
}

function LotSwitcher() {
  const { lots, activeLotId, setActiveLotId } = useLot();
  return (
    <select
      className="lot-switcher"
      value={activeLotId}
      onChange={(e) => setActiveLotId(e.target.value)}
      aria-label="Switch lot"
    >
      {lots.map((lot) => (
        <option key={lot.id} value={lot.id}>{lot.name}</option>
      ))}
    </select>
  );
}

function ProtectedRoute({ user, allowedRole, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => setUser(null);

  return (
    <BrowserRouter>
      <div className="app-root">
        <header className="header">
          <h1 className="logo">Smart Parking</h1>
          <nav className="nav">
            {user?.role === "driver" && (
              <>
                <Link to="/driver/find-parking" className="nav-link">Find Parking</Link>
                <Link to="/driver/account-settings" className="nav-link">Account</Link>
                <Link to="/driver/vehicles" className="nav-link">My Vehicles</Link>
              </>
            )}
            {user?.role === "owner" && (
              <>
                <Link to="/owner/register-lot" className="nav-link">Register Lot</Link>
                <Link to="/owner/announcements" className="nav-link">Announcements</Link>
              </>
            )}
            {user ? (
              <button className="btn small" onClick={handleLogout}>Logout</button>
            ) : (
              <Link to="/login" className="nav-link">Login</Link>
            )}
          </nav>
        </header>

        <Routes>
          <Route path="/login" element={
            <main className="main-single">
              <Login onLogin={setUser} user={user} />
            </main>
          } />

          <Route path="/driver/find-parking" element={
            <ProtectedRoute user={user} allowedRole="driver">
              <main className="main-single">
                <section className="panel">
                  <FindParking userId={user?.id} />
                </section>
              </main>
            </ProtectedRoute>
          } />

          <Route path="/driver/account-settings" element={
            <ProtectedRoute user={user} allowedRole="driver">
              <main className="main-single">
                <section className="panel">
                  <AccountSettings userId={user?.id} />
                </section>
              </main>
            </ProtectedRoute>
          } />

          <Route path="/driver/vehicles" element={
            <ProtectedRoute user={user} allowedRole="driver">
              <main className="main-single">
                <section className="panel">
                  <Vehicles />
                </section>
              </main>
            </ProtectedRoute>
          } />

          <Route path="/owner/register-lot" element={
            <ProtectedRoute user={user} allowedRole="owner">
              <main className="main-single">
                <section className="panel">
                  <RegisterLot />
                </section>
              </main>
            </ProtectedRoute>
          } />

          <Route path="/owner/announcements" element={
            <ProtectedRoute user={user} allowedRole="owner">
              <main className="main-single">
                <section className="panel">
                  <SendAnnouncement />
                </section>
              </main>
            </ProtectedRoute>
          } />

          <Route path="/owner/dashboard" element={
            <ProtectedRoute user={user} allowedRole="owner">
              <OwnerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/owner/spots" element={
            <ProtectedRoute user={user} allowedRole="owner">
              <SpotsPage />
            </ProtectedRoute>
          } />

          <Route path="/owner/reservations" element={
            <ProtectedRoute user={user} allowedRole="owner">
              <ReservationsPage />
            </ProtectedRoute>
          } />

          <Route path="/owner/financials" element={
            <ProtectedRoute user={user} allowedRole="owner">
              <FinancialsRoute />
            </ProtectedRoute>
          } />

          <Route path="/owner/manage-lots" element={
            <ProtectedRoute user={user} allowedRole="owner">
              <ManageLotsPage />
            </ProtectedRoute>
          } />

          <Route path="/owner/lot-settings" element={
            <ProtectedRoute user={user} allowedRole="owner">
              <LotSettingsPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;