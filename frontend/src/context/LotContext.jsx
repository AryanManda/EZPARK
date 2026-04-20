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
        vehicleTypeMultipliers: { car: 1.0, motorcycle: 0.5, ev: 1.2 },
      },
      spots: [],
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
        updatePricingRules,
      }}
    >
      {children}
    </LotContext.Provider>
  );
}

export function useLot() {
  const ctx = useContext(LotContext);
  if (!ctx) throw new Error("useLot must be used inside <LotProvider>");
  return ctx;
}
