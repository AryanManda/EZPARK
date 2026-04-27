import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addPaymentMethod,
  checkoutSession,
  extendSession,
  getActiveSession,
  getDriverAnnouncements,
  getParkingWithFilters,
  getPaymentMethods,
  startSession,
} from "./api/parkingApi";

function FindParking({ userId }) {
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeSession, setActiveSession] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState({ type: "", message: "" });
  const [extraHours, setExtraHours] = useState(1);
  const [endTimePreview, setEndTimePreview] = useState("");
  const [recentlyExtended, setRecentlyExtended] = useState(false);
  const extendPulseTimerRef = useRef(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("price-asc");
  const [carType, setCarType] = useState("any");

  const [checkoutFlowOpen, setCheckoutFlowOpen] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [newCardForm, setNewCardForm] = useState({ cardHolder: "", cardNumber: "", expiry: "" });

  const [announcements, setAnnouncements] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [minimizedAnnouncement, setMinimizedAnnouncement] = useState(null);
  const [openedAnnouncementLotIds, setOpenedAnnouncementLotIds] = useState([]);
  const announcementDialogRef = useRef(null);

  const loadActiveSession = useCallback(async () => {
    try {
      const session = await getActiveSession(userId);
      setActiveSession(session);
    } catch {
      setActiveSession(null);
    }
  }, [userId]);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const methods = await getPaymentMethods(userId);
      setPaymentMethods(methods || []);
    } catch {
      setPaymentMethods([]);
    }
  }, [userId]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await getDriverAnnouncements(userId);
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setAnnouncements([]);
    }
  }, [userId]);

  useEffect(() => {
    loadActiveSession();
    loadPaymentMethods();
    loadAnnouncements();
  }, [loadActiveSession, loadPaymentMethods, loadAnnouncements]);

  const loadParkingResults = useCallback(async (searchLocation = "") => {
    setError("");

    try {
      setLoading(true);
      const data = await getParkingWithFilters({
        location: searchLocation,
        carType,
      });
      setResults(data);
      if (data.length === 0) {
        setError(
          searchLocation
            ? "No parking found for that search."
            : "No parking lots are available right now."
        );
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
  }, [carType]);

  useEffect(() => {
    loadParkingResults(location.trim());
  }, [carType, loadParkingResults]);

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadParkingResults(location.trim());
  };

  const getAnnouncementForLot = useCallback(
    (lotId) => {
      if (!lotId) return null;
      return announcements.find((item) => Number(item.lotId) === Number(lotId)) || null;
    },
    [announcements]
  );

  const selectedLotAnnouncement = selectedLot ? getAnnouncementForLot(selectedLot.id) : null;

  const handleLotSelect = (spot) => {
    setSelectedLot(spot);

    const matchedAnnouncement = getAnnouncementForLot(spot.id);
    if (!matchedAnnouncement) return;

    setMinimizedAnnouncement({
      ...matchedAnnouncement,
      lotName: spot.name,
    });

    const hasAlreadyOpened = openedAnnouncementLotIds.includes(spot.id);
    if (!hasAlreadyOpened) {
      setAnnouncementModalOpen(true);
      setOpenedAnnouncementLotIds((prev) => [...prev, spot.id]);
    }
  };

  const handleBook = async (spot) => {
    try {
      setBookingLoading(true);
      setSessionStatus({ type: "", message: "" });
      const res = await startSession({
        userId,
        lotName: spot.name,
        hours: 1,
      });
      setActiveSession(res.session);
      setSessionStatus({
        type: "success",
        message: `Checked in at ${spot.name} for 1 hour.`,
      });
      await loadParkingResults(location.trim());
      await loadAnnouncements();
    } catch (err) {
      setSessionStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to book spot.",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    const parsedExtraHours = Number(extraHours);
    if (!Number.isFinite(parsedExtraHours) || parsedExtraHours < 1) {
      setSessionStatus({ type: "error", message: "Select a valid extension time." });
      return;
    }
    try {
      setExtendLoading(true);
      setSessionStatus({ type: "", message: "" });
      const res = await extendSession({
        userId,
        extraHours: parsedExtraHours,
      });
      setActiveSession(res.session);
      setSessionStatus({ type: "success", message: res.message });
      setRecentlyExtended(true);
      if (extendPulseTimerRef.current) {
        clearTimeout(extendPulseTimerRef.current);
      }
      extendPulseTimerRef.current = setTimeout(() => {
        setRecentlyExtended(false);
        extendPulseTimerRef.current = null;
      }, 1100);
    } catch (err) {
      setSessionStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to extend session.",
      });
    } finally {
      setExtendLoading(false);
    }
  };

  const openCheckoutFlow = () => {
    setSessionStatus({ type: "", message: "" });
    setSelectedPaymentMethodId(paymentMethods[0]?.id ? String(paymentMethods[0].id) : "");
    setCheckoutFlowOpen(true);
  };

  const closeCheckoutFlow = () => {
    setCheckoutFlowOpen(false);
    setNewCardForm({ cardHolder: "", cardNumber: "", expiry: "" });
  };

  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true);
      setSessionStatus({ type: "", message: "" });

      let paymentMethodId = selectedPaymentMethodId;

      if (!paymentMethods.length) {
        if (!newCardForm.cardHolder || !newCardForm.cardNumber || !newCardForm.expiry) {
          setSessionStatus({ type: "error", message: "Enter card details to continue checkout." });
          return;
        }
        const saved = await addPaymentMethod({
          userId,
          cardHolder: newCardForm.cardHolder.trim(),
          cardNumber: newCardForm.cardNumber.replace(/\s/g, ""),
          expiry: newCardForm.expiry.trim(),
        });
        paymentMethodId = String(saved?.method?.id || "");
      }

      if (!paymentMethodId) {
        setSessionStatus({ type: "error", message: "Select a payment method to continue checkout." });
        return;
      }

      const res = await checkoutSession({
        userId,
        paymentMethodId: Number(paymentMethodId),
      });

      setSessionStatus({ type: "success", message: res.message });
      setActiveSession(null);
      closeCheckoutFlow();
      await loadPaymentMethods();
      await loadParkingResults(location.trim());
      await loadAnnouncements();
    } catch (err) {
      setSessionStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to check out.",
      });
    } finally {
      setCheckoutLoading(false);
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

  useEffect(() => {
    if (!activeSession?.endTime) {
      setEndTimePreview("");
      return;
    }
    const parsedExtraHours = Number(extraHours);
    if (!Number.isFinite(parsedExtraHours) || parsedExtraHours < 1) {
      setEndTimePreview("");
      return;
    }
    const projected = new Date(
      new Date(activeSession.endTime).getTime() + parsedExtraHours * 60 * 60 * 1000
    );
    setEndTimePreview(formatTime(projected.toISOString()));
  }, [activeSession, extraHours]);

  useEffect(
    () => () => {
      if (extendPulseTimerRef.current) {
        clearTimeout(extendPulseTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!announcementModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    announcementDialogRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setAnnouncementModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [announcementModalOpen]);

  const handleMinimizeAnnouncement = () => {
    if (selectedLotAnnouncement && selectedLot) {
      setMinimizedAnnouncement({
        ...selectedLotAnnouncement,
        lotName: selectedLot.name,
      });
    }
    setAnnouncementModalOpen(false);
  };

  const handleCloseAnnouncement = () => {
    setAnnouncementModalOpen(false);
  };

  const handleRestoreAnnouncement = () => {
    if (!minimizedAnnouncement) return;

    const matchedLot = results.find((spot) => Number(spot.id) === Number(minimizedAnnouncement.lotId));
    if (matchedLot) {
      setSelectedLot(matchedLot);
    }
    setAnnouncementModalOpen(true);
  };

  return (
    <>
      <h2 className="section-title">Find Nearby Parking</h2>
      <p className="section-help">
        Search by area, address, or lot name to find available parking.
      </p>

      {activeSession && (
        <div className={`parking-card active-session ${recentlyExtended ? "active-session-pulse" : ""}`}>
          <div className="card-header">
            <h3>Active Session: {activeSession.lotName}</h3>
            <span className="chip chip-active">Active</span>
          </div>
          <p className="muted">
            Started: {formatTime(activeSession.startTime)}&nbsp;|&nbsp;Ends: {formatTime(activeSession.endTime)}
          </p>
          {endTimePreview && (
            <p className="muted extend-preview">After extension: {endTimePreview}</p>
          )}
          <form onSubmit={handleExtend} className="form-inline session-actions">
            <select
              className="input"
              value={extraHours}
              onChange={(e) => setExtraHours(Number(e.target.value))}
              disabled={extendLoading || checkoutLoading}
            >
              {[1, 2, 3, 4].map((h) => (
                <option key={h} value={h}>
                  {h} hr{h > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <button className="btn primary" type="submit" disabled={extendLoading || checkoutLoading}>
              {extendLoading ? "Extending..." : "Extend Time"}
            </button>
            <button className="btn" type="button" onClick={openCheckoutFlow} disabled={extendLoading || checkoutLoading}>
              {checkoutLoading ? "Checking Out..." : "Check Out"}
            </button>
          </form>

          {checkoutFlowOpen && (
            <div className="parking-card" style={{ marginTop: "12px" }}>
              <h3 style={{ marginTop: 0 }}>Complete checkout payment</h3>

              {paymentMethods.length > 0 ? (
                <label className="field">
                  <span className="field-label">Select payment account</span>
                  <select
                    className="input"
                    value={selectedPaymentMethodId}
                    onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                    disabled={checkoutLoading}
                  >
                    <option value="">Select card...</option>
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.masked} ({m.expiry})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="form-vertical">
                  <p className="muted" style={{ marginTop: 0 }}>
                    No saved payment account found. Add new card details to proceed.
                  </p>
                  <label className="field">
                    <span className="field-label">Cardholder name</span>
                    <input
                      className="input"
                      value={newCardForm.cardHolder}
                      onChange={(e) => setNewCardForm((prev) => ({ ...prev, cardHolder: e.target.value }))}
                      disabled={checkoutLoading}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Card number</span>
                    <input
                      className="input"
                      value={newCardForm.cardNumber}
                      onChange={(e) => setNewCardForm((prev) => ({ ...prev, cardNumber: e.target.value }))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      disabled={checkoutLoading}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Expiry (MM/YY)</span>
                    <input
                      className="input"
                      value={newCardForm.expiry}
                      onChange={(e) => setNewCardForm((prev) => ({ ...prev, expiry: e.target.value }))}
                      placeholder="08/27"
                      maxLength={5}
                      disabled={checkoutLoading}
                    />
                  </label>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button className="btn primary" type="button" onClick={handleCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? "Processing..." : "Pay and Check Out"}
                </button>
                <button className="btn" type="button" onClick={closeCheckoutFlow} disabled={checkoutLoading}>
                  Cancel
                </button>
              </div>
            </div>
          )}

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
        <select
          className="input"
          value={carType}
          onChange={(e) => setCarType(e.target.value)}
          aria-label="Car type"
        >
          <option value="any">Any car type</option>
          <option value="compact">Compact</option>
          <option value="suv">SUV</option>
          <option value="ev">EV</option>
        </select>
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
          {visibleResults.map((spot) => {
            const lotAnnouncement = getAnnouncementForLot(spot.id);
            const isSelected = selectedLot?.id === spot.id;

            return (
              <article
                key={spot.id ?? spot.name}
                className={`parking-card ${spot.available ? "" : "disabled"} ${isSelected ? "selected-lot" : ""} ${lotAnnouncement ? "lot-has-announcement" : ""}`}
                onClick={() => handleLotSelect(spot)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLotSelect(spot);
                  }
                }}
              >
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

          {lotAnnouncement && (
            <div className="lot-announcement-hint">
              <span className="chip chip-announcement">Announcement</span>
            </div>
          )}

                {spot.available && !activeSession && (
                  <button
                    className="btn primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBook(spot);
                    }}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? "Checking In..." : "Check In (1 hr)"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {announcementModalOpen && selectedLotAnnouncement && selectedLot && (
        <div
          className="announcement-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAnnouncementModalOpen(false);
            }
          }}
        >
          <div
            className="announcement-fullscreen"
            ref={announcementDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            tabIndex={-1}
          >
            <div className="announcement-fullscreen-top">
              <div>
                <p className="announcement-eyebrow">Parking lot announcement</p>
                <h2 id="announcement-title">{selectedLot.name}</h2>
                <p className="muted">
                  {new Date(selectedLotAnnouncement.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="announcement-modal-actions">
                <button className="btn" type="button" onClick={handleMinimizeAnnouncement}>
                  Minimize
                </button>
                <button className="btn primary" type="button" onClick={handleCloseAnnouncement}>
                  Close
                </button>
              </div>
            </div>

            <div className="announcement-fullscreen-body">
              <p>{selectedLotAnnouncement.message}</p>
            </div>
          </div>
        </div>
      )}

      {!announcementModalOpen && minimizedAnnouncement && (
        <button
          type="button"
          className="announcement-fab"
          onClick={handleRestoreAnnouncement}
          aria-label="Open minimized lot announcement"
        >
          <span className="announcement-fab-label">Lot announcement</span>
          <strong>{minimizedAnnouncement.lotName || `Lot #${minimizedAnnouncement.lotId}`}</strong>
        </button>
      )}
    </>
  );
}

export default FindParking;