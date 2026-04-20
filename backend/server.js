const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: "http://localhost:5173"
}));
app.use(express.json());

let parkingDB = [
  { name: "Lot A", location: "Downtown", price: 10, available: true },
  { name: "Lot B", location: "Downtown", price: 8, available: false }
];


// Find Nearby Parking
app.get("/api/parking", (req, res) => {
  const { location } = req.query;

  if (!location) {
    return res.status(400).json({ error: "Invalid location" });
  }

  const results = parkingDB.filter(
    (spot) => spot.location.toLowerCase() === location.toLowerCase()
  );

  if (results.length === 0) {
    return res.json([]);
  }

  res.json(results);
});


// Register Parking Lot
app.post("/api/register", (req, res) => {
  const { name, location, price } = req.body;

  if (!name || !location || !price) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const newLot = {
    name,
    location,
    price,
    available: true
  };

  parkingDB.push(newLot);
  res.json({ message: "Parking lot registered" });
});


// UC-13: Payment Methods
let paymentMethods = [];

app.post("/api/payment-method", (req, res) => {
  const { userId, cardHolder, cardNumber, expiry } = req.body;

  if (!userId || !cardHolder || !cardNumber || !expiry) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ""))) {
    return res.status(400).json({ error: "Card number must be 16 digits." });
  }

  const masked = `**** **** **** ${cardNumber.replace(/\s/g, "").slice(-4)}`;
  const method = { id: Date.now(), userId, cardHolder, masked, expiry };
  paymentMethods.push(method);
  res.json({ message: "Payment method saved successfully.", method });
});

app.get("/api/payment-method", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required." });
  res.json(paymentMethods.filter((m) => m.userId === userId));
});


// UC-14: Parking Sessions
let sessions = [];

app.post("/api/sessions/start", (req, res) => {
  const { userId, lotName, hours } = req.body;

  if (!userId || !lotName || !hours || hours < 1) {
    return res.status(400).json({ error: "userId, lotName, and hours are required." });
  }

  sessions = sessions.map((s) =>
    s.userId === userId && s.active ? { ...s, active: false } : s
  );

  const now = new Date();
  const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const session = {
    id: Date.now(),
    userId,
    lotName,
    startTime: now.toISOString(),
    endTime: endTime.toISOString(),
    active: true,
  };
  sessions.push(session);
  res.json({ message: "Parking session started.", session });
});

app.get("/api/sessions/active", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required." });
  const session = sessions.find((s) => s.userId === userId && s.active) || null;
  res.json(session);
});

app.post("/api/sessions/extend", (req, res) => {
  const { userId, extraHours } = req.body;

  if (!userId || !extraHours || extraHours < 1) {
    return res.status(400).json({ error: "userId and extraHours are required." });
  }

  const session = sessions.find((s) => s.userId === userId && s.active);
  if (!session) {
    return res.status(404).json({ error: "No active session found." });
  }

  const current = new Date(session.endTime);
  session.endTime = new Date(current.getTime() + extraHours * 60 * 60 * 1000).toISOString();
  res.json({ message: "Time extension successful. Session end time updated.", session });
});

// soha-UC1: LOGIN 

let users = [
  { id: 1, email: "user@gmail.com", password: "pass123" }
];

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email && !password) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  }

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  res.json({ message: "Login successful!" });
});

// soha-UC: MANAGE VEHICLES 

let vehicles = [];

app.post("/api/vehicles/add", (req, res) => {
  const { licensePlate, type } = req.body;
  if (!licensePlate || !type) {
    return res.status(400).json({ error: "Vehicle information is required." });
  }
  const newVehicle = { id: Date.now(), licensePlate, type };
  vehicles.push(newVehicle);
  res.json({ message: "Vehicle added successfully!", vehicle: newVehicle });
});

app.put("/api/vehicles/update/:id", (req, res) => {
  const { id } = req.params;
  const { licensePlate, type } = req.body;
  const vehicle = vehicles.find((v) => v.id == id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });
  if (!licensePlate || !type) return res.status(400).json({ error: "Invalid vehicle information." });
  vehicle.licensePlate = licensePlate;
  vehicle.type = type;
  res.json({ message: "Vehicle updated successfully!" });
});

app.delete("/api/vehicles/delete/:id", (req, res) => {
  const { id } = req.params;
  const index = vehicles.findIndex((v) => v.id == id);
  if (index === -1) return res.status(404).json({ error: "Vehicle not found." });
  vehicles.splice(index, 1);
  res.json({ message: "Vehicle removed successfully!" });
});

app.listen(5000, () => console.log("Server running on port 5000"));
