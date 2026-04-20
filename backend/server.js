const express = require("express");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

let parkingDB = [
  {
    id: 1,
    name: "Lot A",
    location: "Downtown",
    fullAddress: "101 Main St",
    price: 10,
    capacity: 20,
    remainingSpots: 20,
    available: true,
    status: "approved",
  },
  {
    id: 2,
    name: "Lot B",
    location: "Downtown",
    fullAddress: "202 Elm St",
    price: 8,
    capacity: 10,
    remainingSpots: 0,
    available: false,
    status: "approved",
  },
];

let paymentMethods = [];
let sessions = [];

const normalize = (value = "") => value.trim().toLowerCase();

const refreshLotAvailability = (lot) => {
  lot.available = lot.remainingSpots > 0 && lot.status === "approved";
  return lot;
};

app.get("/api/parking", (req, res) => {
  const { location = "" } = req.query;

  if (!location.trim()) {
    return res.status(400).json({ error: "Invalid location" });
  }

  const query = normalize(location);

  const results = parkingDB
    .filter((spot) => spot.status === "approved")
    .filter(
      (spot) =>
        normalize(spot.location).includes(query) ||
        normalize(spot.fullAddress).includes(query) ||
        normalize(spot.name).includes(query)
    )
    .map((spot) => refreshLotAvailability({ ...spot }));

  return res.json(results);
});

app.post("/api/register", (req, res) => {
  const { name, location, fullAddress, price, capacity } = req.body;

  if (!name || !location || !price) {
    return res.status(400).json({ error: "Lot name, location, and price are required." });
  }

  const parsedPrice = Number(price);
  const parsedCapacity = capacity ? Number(capacity) : 1;

  if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: "Price must be a valid positive number." });
  }

  if (Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
    return res.status(400).json({ error: "Capacity must be at least 1." });
  }

  const newLot = {
    id: Date.now(),
    name: name.trim(),
    location: location.trim(),
    fullAddress: fullAddress?.trim() || location.trim(),
    price: parsedPrice,
    capacity: parsedCapacity,
    remainingSpots: parsedCapacity,
    available: true,
    status: "approved",
  };

  parkingDB.push(newLot);

  return res.json({
    message: "Parking lot registered successfully.",
    lot: newLot,
  });
});

app.post("/api/payment-method", (req, res) => {
  const { userId, cardHolder, cardNumber, expiry } = req.body;

  if (!userId || !cardHolder || !cardNumber || !expiry) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const cleanedCard = cardNumber.replace(/\s/g, "");
  if (!/^\d{16}$/.test(cleanedCard)) {
    return res.status(400).json({ error: "Card number must be 16 digits." });
  }

  const masked = `**** **** **** ${cleanedCard.slice(-4)}`;
  const method = { id: Date.now(), userId, cardHolder, masked, expiry };
  paymentMethods.push(method);

  return res.json({ message: "Payment method saved successfully.", method });
});

app.get("/api/payment-method", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required." });
  return res.json(paymentMethods.filter((m) => String(m.userId) === String(userId)));
});

app.post("/api/sessions/start", (req, res) => {
  const { userId, lotName, hours } = req.body;

  if (!userId || !lotName || !hours || Number(hours) < 1) {
    return res.status(400).json({ error: "userId, lotName, and hours are required." });
  }

  const lot = parkingDB.find((l) => normalize(l.name) === normalize(lotName));
  if (!lot) {
    return res.status(404).json({ error: "Parking lot not found." });
  }

  refreshLotAvailability(lot);

  if (!lot.available || lot.remainingSpots < 1) {
    return res.status(400).json({ error: "This parking lot is full." });
  }

  const existingSession = sessions.find((s) => String(s.userId) === String(userId) && s.active);
  if (existingSession) {
    return res.status(400).json({ error: "User already has an active parking session." });
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + Number(hours) * 60 * 60 * 1000);

  lot.remainingSpots -= 1;
  refreshLotAvailability(lot);

  const session = {
    id: Date.now(),
    userId,
    lotId: lot.id,
    lotName: lot.name,
    startTime: now.toISOString(),
    endTime: endTime.toISOString(),
    active: true,
  };

  sessions.push(session);

  return res.json({ message: "Parking session started.", session, lot });
});

app.get("/api/sessions/active", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required." });

  const session = sessions.find((s) => String(s.userId) === String(userId) && s.active) || null;
  return res.json(session);
});

app.post("/api/sessions/extend", (req, res) => {
  const { userId, extraHours } = req.body;

  if (!userId || !extraHours || Number(extraHours) < 1) {
    return res.status(400).json({ error: "userId and extraHours are required." });
  }

  const session = sessions.find((s) => String(s.userId) === String(userId) && s.active);
  if (!session) {
    return res.status(404).json({ error: "No active session found." });
  }

  const current = new Date(session.endTime);
  session.endTime = new Date(current.getTime() + Number(extraHours) * 60 * 60 * 1000).toISOString();

  return res.json({ message: "Time extension successful. Session end time updated.", session });
});

app.post("/api/sessions/checkout", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  const hasPaymentMethod = paymentMethods.some((m) => String(m.userId) === String(userId));
  if (!hasPaymentMethod) {
    return res.status(400).json({ error: "A payment method is required before checkout." });
  }

  const session = sessions.find((s) => String(s.userId) === String(userId) && s.active);
  if (!session) {
    return res.status(404).json({ error: "No active session found." });
  }

  session.active = false;
  session.checkedOutAt = new Date().toISOString();

  const lot = parkingDB.find((l) => l.id === session.lotId);
  if (lot) {
    lot.remainingSpots = Math.min(lot.capacity, lot.remainingSpots + 1);
    refreshLotAvailability(lot);
  }

  return res.json({
    message: "Check Out Successful!",
    session,
    lot,
  });
});

app.listen(5000, () => console.log("Server running on port 5000"));
