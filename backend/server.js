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


// 🔍 Find Nearby Parking
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


// 🅿️ Register Parking Lot
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

app.listen(5000, () => console.log("Server running on port 5000"));