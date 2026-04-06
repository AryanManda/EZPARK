// server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory "database"
let lots = [];

// Helper: basic validation for lot
function validateLot(lot) {
  const errors = [];
  if (!lot.name || lot.name.trim() === '') errors.push('Lot name is required');
  if (!lot.address || lot.address.trim() === '') errors.push('Address is required');
  const validCarTypes = ['Sedan', 'SUV', 'Compact'];
  if (!lot.carType || !validCarTypes.includes(lot.carType)) {
    errors.push('Invalid car type');
  }
  if (lot.rate == null || isNaN(lot.rate) || lot.rate <= 0) {
    errors.push('Hourly rate must be positive');
  }
  if (lot.spots == null || isNaN(lot.spots) || lot.spots < 1) {
    errors.push('Spots must be at least 1');
  }
  return errors;
}

// POST /lots - owner registers a lot
app.post('/lots', (req, res) => {
  const lot = req.body;
  const errors = validateLot(lot);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  const savedLot = { id: lots.length + 1, ...lot };
  lots.push(savedLot);
  res.status(201).json(savedLot);
});

// GET /lots/search?location=Downtown&carType=Sedan
app.get('/lots/search', (req, res) => {
  const { location, carType } = req.query;
  if (!location || location.trim() === '') {
    return res.status(400).json({ error: 'Location is required' });
  }
  if (!carType || carType.trim() === '') {
    return res.status(400).json({ error: 'Car type is required' });
  }

  // Very simple "nearby" logic: match substring in address and car type
  const results = lots.filter(
    (lot) =>
      lot.address.toLowerCase().includes(location.toLowerCase()) &&
      lot.carType === carType
  );

  if (results.length === 0) {
    return res.status(200).json({ message: 'No parking lots found', results: [] });
  }
  res.json({ results });
});

// Seed some data for driver tests
lots.push({
  id: 1,
  name: 'Downtown Garage',
  address: 'Downtown Main St',
  carType: 'Sedan',
  rate: 5,
  spots: 30,
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; // for tests