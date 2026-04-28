// src/context/LotContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getOwnerLots, getLotSpots } from "../api/parkingApi.js";

const LotContext = createContext(null);

const AUTH_STORAGE_KEY = "ezpark-auth-user";

function readOwnerIdFromSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.role === "owner" ? parsed.id : null;
  } catch {
    return null;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function toVehicleLabel(type) {
  switch (String(type || "").toLowerCase()) {
    case "compact":
    case "car":
      return "Car";
    case "motorcycle":
      return "Motorcycle";
    case "ev":
      return "EV";
    default:
      return "All";
  }
}

function createDefaultPricingRules(baseRate) {
  return {
    baseRate,
    durationMultiplier: 1.0,
    durationDiscountAfterHours: 4,
    durationDiscountPercent: 10,
    dailyMaximum: null,
    minimumCharge: null,
    vehicleTypeMultipliers: { car: 1.0, motorcycle: 0.5, ev: 1.2 },
  };
}

function createGeneratedSpots(capacity, occupiedCount, allowedVehicleTypes, previousSpots = []) {
  const spotTotal = Math.max(1, Number(capacity) || 1);
  const occupiedTotal = Math.max(0, Math.min(spotTotal, Number(occupiedCount) || 0));
  const vehicleTypes = allowedVehicleTypes?.length ? allowedVehicleTypes : ["All"];

  return Array.from({ length: spotTotal }, (_, index) => {
    const previousSpot = previousSpots[index];
    const rowLetter = String.fromCharCode(65 + Math.floor(index / 10));
    const rowNumber = (index % 10) + 1;
    const status = index < occupiedTotal ? "occupied" : "available";

    return {
      id: previousSpot?.id || `${rowLetter}${rowNumber}`,
      status: previousSpot?.status || status,
      vehicleType: previousSpot?.vehicleType || toVehicleLabel(vehicleTypes[index % vehicleTypes.length]),
      timeLimitMinutes: previousSpot?.timeLimitMinutes ?? null,
      driver: previousSpot?.driver ?? null,
      car: previousSpot?.car ?? null,
      plate: previousSpot?.plate ?? null,
      time: previousSpot?.time ?? null,
      sessionStartIso: previousSpot?.sessionStartIso ?? null,
      overrideReason: previousSpot?.overrideReason ?? null,
    };
  });
}

function createFallbackLot() {
  return {
    id: "",
    backendLotId: null,
    ownerId: "",
    name: "Loading...",
    address: "",
    defaultTimeLimitMinutes: null,
    metrics: {
      totalRevenue: "$0",
      occupants: 0,
      reservations: 0,
      availableSpots: 0,
    },
    pricingRules: createDefaultPricingRules(0),
    spots: [],
    reservations: [],
    allowedVehicleTypes: ["All"],
  };
}

function hydrateLot(apiLot, previousLot) {
  const occupiedCount = Math.max(0, (apiLot.capacity || 0) - (apiLot.remainingSpots || 0));
  return {
    id: String(apiLot.id),
    backendLotId: apiLot.id,
    ownerId: apiLot.ownerId,
    name: apiLot.name,
    address: apiLot.fullAddress || apiLot.location,
    defaultTimeLimitMinutes: previousLot?.defaultTimeLimitMinutes ?? null,
    metrics: {
      totalRevenue: previousLot?.metrics?.totalRevenue || formatCurrency(0),
      occupants: occupiedCount,
      reservations: previousLot?.metrics?.reservations ?? 0,
      availableSpots: apiLot.remainingSpots ?? 0,
    },
    pricingRules: previousLot?.pricingRules || createDefaultPricingRules(Number(apiLot.price) || 0),
    spots: createGeneratedSpots(
      apiLot.capacity,
      occupiedCount,
      apiLot.allowedVehicleTypes?.map(toVehicleLabel),
      previousLot?.spots
    ),
    reservations: previousLot?.reservations || [],
    allowedVehicleTypes: apiLot.allowedVehicleTypes?.map(toVehicleLabel) || ["All"],
  };
}

export function LotProvider({ children, user }) {
  const [lots, setLots] = useState([]);
  const [activeLotId, setActiveLotId] = useState("");
  const [lotsLoading, setLotsLoading] = useState(false);

  useEffect(() => {
    const ownerId = user?.role === "owner" ? user.id : readOwnerIdFromSession();
    if (!ownerId) {
      setLots([]);
      setActiveLotId("");
      return;
    }

    let mounted = true;
    setLotsLoading(true);

    getOwnerLots(ownerId)
      .then((ownerLots) => {
        if (!mounted) return;

        setLots((previousLots) => {
          const nextLots = (ownerLots || []).map((apiLot) => {
            const previousLot = previousLots.find((lot) => lot.backendLotId === apiLot.id);
            return hydrateLot(apiLot, previousLot);
          });

          setActiveLotId((currentActiveLotId) => {
            if (nextLots.some((lot) => lot.id === currentActiveLotId)) {
              return currentActiveLotId;
            }
            return nextLots[0]?.id || "";
          });

          return nextLots;
        });
      })
      .catch(() => {
        if (!mounted) return;
        setLots([]);
        setActiveLotId("");
      })
      .finally(() => {
        if (mounted) setLotsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.role]);

  const activeLot = lots.find((l) => l.id === activeLotId) ?? lots[0] ?? createFallbackLot();

  // ── Hydrate spots from DB whenever the active lot changes, then poll every 15s ──
  const activeLotBackendId = activeLot.backendLotId;
  const activeOwnerIdForSpots = user?.role === "owner" ? user.id : readOwnerIdFromSession();
  const pollRef = useRef(null);

  useEffect(() => {
    if (!activeLotBackendId || !activeOwnerIdForSpots) return;
    let mounted = true;

    function applySpots(apiSpots) {
      setLots((prev) =>
        prev.map((l) =>
          l.backendLotId !== activeLotBackendId
            ? l
            : {
                ...l,
                spots: apiSpots.map((s) => ({
                  id: s.id,
                  status: s.status,
                  vehicleType: s.vehicleType,
                  timeLimitMinutes: s.timeLimitMinutes,
                  overrideReason: s.overrideReason,
                  driver: s.driverName ?? null,
                  car: s.vehicleMake && s.vehicleModel ? `${s.vehicleMake} ${s.vehicleModel}` : null,
                  plate: s.licensePlate ?? null,
                  time: s.sessionStartTime ?? null,
                  sessionStartIso: s.sessionStartTime ?? null,
                })),
              }
        )
      );
    }

    getLotSpots(activeLotBackendId, activeOwnerIdForSpots)
      .then((apiSpots) => { if (mounted) applySpots(apiSpots); })
      .catch(() => {});

    pollRef.current = setInterval(() => {
      getLotSpots(activeLotBackendId, activeOwnerIdForSpots)
        .then((apiSpots) => { if (mounted) applySpots(apiSpots); })
        .catch(() => {});
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(pollRef.current);
    };
  }, [activeLotBackendId, activeOwnerIdForSpots]);

  function addLot(apiLot) {
    setLots((prev) => [hydrateLot(apiLot), ...prev]);
    setActiveLotId(String(apiLot.id));
  }

  function updateLot(apiLot) {
    setLots((prev) =>
      prev.map((lot) =>
        lot.backendLotId === apiLot.id ? hydrateLot(apiLot, lot) : lot
      )
    );
  }

  function deleteLot(id) {
    setLots((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (activeLotId === id && next.length > 0) {
        setActiveLotId(next[0].id);
      }
      return next;
    });
  }

  // Merge `changes` into a single spot object
  function updateSpot(lotId, spotId, changes) {
    setLots((prev) =>
      prev.map((lot) =>
        lot.id !== lotId
          ? lot
          : {
              ...lot,
              spots: lot.spots.map((s) =>
                s.id === spotId ? { ...s, ...changes } : s
              ),
            }
      )
    );
  }

  // Manual status override with occupied->reserved conflict guard.
  function updateSpotStatus(lotId, spotId, nextStatus) {
    const lot = lots.find((l) => l.id === lotId);
    const spot = lot?.spots.find((s) => s.id === spotId);
    if (!spot) return { ok: false, error: "Spot not found." };
    if (spot.status === "occupied" && nextStatus === "reserved") {
      return { ok: false, error: "Cannot reserve an occupied spot." };
    }
    updateSpot(lotId, spotId, { status: nextStatus });
    return { ok: true };
  }

  // Merge `rules` into a lot's pricingRules
  function updatePricingRules(lotId, rules) {
    setLots((prev) =>
      prev.map((lot) =>
        lot.id !== lotId
          ? lot
          : { ...lot, pricingRules: { ...lot.pricingRules, ...rules } }
      )
    );
  }

  function cancelReservation(lotId, reservationId) {
    setLots((prev) =>
      prev.map((lot) => {
        if (lot.id !== lotId) return lot;
        const target = lot.reservations?.find((r) => r.id === reservationId);
        if (!target) return lot;
        const shouldDecrement = target.status === "Active" || target.status === "Upcoming";
        return {
          ...lot,
          metrics: {
            ...lot.metrics,
            reservations: shouldDecrement
              ? Math.max(0, (lot.metrics?.reservations ?? 0) - 1)
              : lot.metrics?.reservations ?? 0,
          },
          reservations: (lot.reservations ?? []).map((r) =>
            r.id === reservationId ? { ...r, status: "Cancelled" } : r
          ),
          spots: lot.spots.map((s) =>
            s.id === target.spot && s.status === "reserved"
              ? { ...s, status: "available", driver: null, car: null, plate: null, time: null }
              : s
          ),
        };
      })
    );
  }

  function applyDefaultTimeLimit(lotId, minutes) {
    const parsed = Number(minutes);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { ok: false, error: "Enter a valid time limit in minutes." };
    }
    setLots((prev) =>
      prev.map((lot) =>
        lot.id !== lotId
          ? lot
          : {
              ...lot,
              defaultTimeLimitMinutes: parsed,
              spots: lot.spots.map((s) =>
                s.timeLimitMinutes == null
                  ? { ...s, timeLimitMinutes: parsed }
                  : s
              ),
            }
      )
    );
    return { ok: true };
  }

  function addSpot(lotId, apiSpot) {
    setLots((prev) =>
      prev.map((lot) =>
        lot.id !== lotId
          ? lot
          : {
              ...lot,
              spots: [
                ...lot.spots,
                {
                  id: apiSpot.id,
                  status: apiSpot.status,
                  vehicleType: apiSpot.vehicleType,
                  timeLimitMinutes: apiSpot.timeLimitMinutes,
                  overrideReason: apiSpot.overrideReason,
                  driver: null,
                  car: null,
                  plate: null,
                  time: null,
                  sessionStartIso: null,
                },
              ],
            }
      )
    );
  }

  function removeSpots(lotId, spotIds) {
    const idSet = new Set(spotIds);
    setLots((prev) =>
      prev.map((lot) =>
        lot.id !== lotId
          ? lot
          : { ...lot, spots: lot.spots.filter((s) => !idSet.has(s.id)) }
      )
    );
  }

  return (
    <LotContext.Provider
      value={{
        lots,
        activeLotId,
        activeLot,
        lotsLoading,
        setActiveLotId,
        addLot,
        updateLot,
        deleteLot,
        updateSpot,
        updateSpotStatus,
        updatePricingRules,
        cancelReservation,
        applyDefaultTimeLimit,
        addSpot,
        removeSpots,
      }}
    >
      {children}
    </LotContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLot() {
  const ctx = useContext(LotContext);
  if (!ctx) throw new Error("useLot must be used inside <LotProvider>");
  return ctx;
}
