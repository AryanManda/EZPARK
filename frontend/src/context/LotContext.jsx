// src/context/LotContext.jsx
import React, { createContext, useContext, useState } from "react";
import { INITIAL_LOTS } from "../utils/mockLots.js";

const LotContext = createContext(null);

export function LotProvider({ children }) {
  const [lots, setLots] = useState(INITIAL_LOTS);
  const [activeLotId, setActiveLotId] = useState(INITIAL_LOTS[0].id);

  const activeLot = lots.find((l) => l.id === activeLotId) ?? lots[0];

  function addLot({ name, address }) {
    const newLot = {
      id: `lot-${Date.now()}`,
      name,
      address,
      metrics: { totalRevenue: "$0", occupants: 0, reservations: 0, availableSpots: 0 },
      pricingRules: {
        baseRate: 2.0,
        durationMultiplier: 1.0,
        durationDiscountAfterHours: 4,
        durationDiscountPercent: 10,
        dailyMaximum: null,
        minimumCharge: null,
        vehicleTypeMultipliers: { car: 1.0, motorcycle: 0.5, ev: 1.2 },
      },
      defaultTimeLimitMinutes: null,
      spots: [],
      reservations: [],
    };
    setLots((prev) => [...prev, newLot]);
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

  return (
    <LotContext.Provider
      value={{
        lots,
        activeLotId,
        activeLot,
        setActiveLotId,
        addLot,
        deleteLot,
        updateSpot,
        updateSpotStatus,
        updatePricingRules,
        cancelReservation,
        applyDefaultTimeLimit,
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
