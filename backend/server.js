const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

const db = new Database(path.join(__dirname, "ezpark.sqlite"));

const normalize = (value = "") => String(value).trim().toLowerCase();
const nowIso = () => new Date().toISOString();

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hashPassword(password) {
  return crypto.scryptSync(String(password), "ezpark-auth-salt", 64).toString("hex");
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return hashPassword(password) === String(passwordHash);
}

function ensureUserAuthColumns() {
  const columns = db.prepare(`PRAGMA table_info(users)`).all();
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("username")) {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT`);
  }
  if (!columnNames.has("email")) {
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
  }
  if (!columnNames.has("password_hash")) {
    db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

function ensureLotCoordColumns() {
  const columns = db.prepare(`PRAGMA table_info(parking_lots)`).all();
  const columnNames = new Set(columns.map((c) => c.name));
  if (!columnNames.has("lat")) db.exec(`ALTER TABLE parking_lots ADD COLUMN lat REAL`);
  if (!columnNames.has("lng")) db.exec(`ALTER TABLE parking_lots ADD COLUMN lng REAL`);

  // Backfill demo lots that were seeded before coordinates were introduced
  db.prepare(
    `UPDATE parking_lots SET lat = 40.71280, lng = -74.00600
     WHERE name = 'Lot A' AND owner_id = 'owner-1' AND lat IS NULL`
  ).run();
  db.prepare(
    `UPDATE parking_lots SET lat = 40.71420, lng = -74.00450
     WHERE name = 'Lot B' AND owner_id = 'owner-1' AND lat IS NULL`
  ).run();
}

function ensureSpotColumns() {
  const columns = db.prepare(`PRAGMA table_info(spots)`).all();
  const columnNames = new Set(columns.map((c) => c.name));
  if (!columnNames.has("driver_name"))       db.exec(`ALTER TABLE spots ADD COLUMN driver_name TEXT`);
  if (!columnNames.has("vehicle_make"))      db.exec(`ALTER TABLE spots ADD COLUMN vehicle_make TEXT`);
  if (!columnNames.has("vehicle_model"))     db.exec(`ALTER TABLE spots ADD COLUMN vehicle_model TEXT`);
  if (!columnNames.has("license_plate"))     db.exec(`ALTER TABLE spots ADD COLUMN license_plate TEXT`);
  if (!columnNames.has("session_start_time")) db.exec(`ALTER TABLE spots ADD COLUMN session_start_time TEXT`);
}

function ensureSessionSpotColumn() {
  const columns = db.prepare(`PRAGMA table_info(parking_sessions)`).all();
  const columnNames = new Set(columns.map((c) => c.name));
  if (!columnNames.has("spot_id")) db.exec(`ALTER TABLE parking_sessions ADD COLUMN spot_id TEXT`);
}

function parseAllowedTypes(raw) {
  if (!raw) return ["any"];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => normalize(v)) : ["any"];
  } catch {
    return ["any"];
  }
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('driver', 'owner')),
      display_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parking_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      full_address TEXT NOT NULL,
      price_per_hour REAL NOT NULL,
      total_spots INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      allowed_vehicle_types TEXT NOT NULL DEFAULT '["any"]',
      lat REAL,
      lng REAL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      card_holder TEXT NOT NULL,
      masked TEXT NOT NULL,
      expiry TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parking_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      lot_id INTEGER NOT NULL,
      lot_name_snapshot TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      checked_out_at TEXT,
      payment_method_id INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id TEXT NOT NULL,
      lot_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcement_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      delivered_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spots (
      id TEXT NOT NULL,
      lot_id INTEGER NOT NULL,
      vehicle_type TEXT NOT NULL DEFAULT 'All',
      status TEXT NOT NULL DEFAULT 'available',
      time_limit_minutes INTEGER,
      override_reason TEXT,
      PRIMARY KEY (id, lot_id)
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      license_plate TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, license_plate)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON parking_sessions(user_id, active);
    CREATE INDEX IF NOT EXISTS idx_sessions_lot_active ON parking_sessions(lot_id, active);
    CREATE INDEX IF NOT EXISTS idx_lots_owner ON parking_lots(owner_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);
  `);

  ensureUserAuthColumns();
  ensureLotCoordColumns();
  ensureSpotColumns();
  ensureSessionSpotColumn();

  db.prepare(
    `INSERT OR IGNORE INTO users
      (id, role, display_name, username, email, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "driver-1",
    "driver",
    "Driver One",
    "driver",
    "driver@test.com",
    hashPassword("password123"),
    nowIso()
  );
  db.prepare(
    `INSERT OR IGNORE INTO users
      (id, role, display_name, username, email, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "owner-1",
    "owner",
    "Owner One",
    "owner",
    "owner@test.com",
    hashPassword("password123"),
    nowIso()
  );

  db.prepare(
    `UPDATE users
     SET username = COALESCE(NULLIF(username, ''), ?),
         email = COALESCE(NULLIF(email, ''), ?),
         password_hash = CASE WHEN password_hash = '' THEN ? ELSE password_hash END
     WHERE id = ?`
  ).run("driver", "driver@test.com", hashPassword("password123"), "driver-1");

  db.prepare(
    `UPDATE users
     SET username = COALESCE(NULLIF(username, ''), ?),
         email = COALESCE(NULLIF(email, ''), ?),
         password_hash = CASE WHEN password_hash = '' THEN ? ELSE password_hash END
     WHERE id = ?`
  ).run("owner", "owner@test.com", hashPassword("password123"), "owner-1");

  const lotCount = db.prepare(`SELECT COUNT(*) AS count FROM parking_lots`).get().count;
  if (lotCount === 0) {
    const insertLot = db.prepare(
      `INSERT INTO parking_lots
      (owner_id, name, location, full_address, price_per_hour, total_spots, status, allowed_vehicle_types, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?)`
    );

    insertLot.run(
      "owner-1",
      "Lot A",
      "Downtown",
      "101 Main St",
      10,
      20,
      JSON.stringify(["compact", "suv", "ev", "any"]),
      nowIso()
    );
    insertLot.run(
      "owner-1",
      "Lot B",
      "Downtown",
      "202 Elm St",
      8,
      10,
      JSON.stringify(["compact", "suv", "any"]),
      nowIso()
    );

    // Seed coordinates for demo lots (can be overwritten via owner UI)
    db.prepare(`UPDATE parking_lots SET lat = 40.71280, lng = -74.00600 WHERE name = 'Lot A' AND owner_id = 'owner-1'`).run();
    db.prepare(`UPDATE parking_lots SET lat = 40.71420, lng = -74.00450 WHERE name = 'Lot B' AND owner_id = 'owner-1'`).run();
  }

  db.prepare(
    `INSERT OR IGNORE INTO vehicles (user_id, license_plate, make, model, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run("driver-1", "ABC1234", "Toyota", "Corolla", nowIso());
  db.prepare(
    `INSERT OR IGNORE INTO vehicles (user_id, license_plate, make, model, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run("driver-1", "XYZ5678", "Honda", "Civic", nowIso());
  db.prepare(
    `INSERT OR IGNORE INTO vehicles (user_id, license_plate, make, model, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run("driver-1", "DEF9012", "Ford", "Mustang", nowIso());
}

function getActiveCheckInsCount(lotId) {
  return db
    .prepare(`SELECT COUNT(*) AS count FROM parking_sessions WHERE lot_id = ? AND active = 1`)
    .get(lotId).count;
}

function lotToApiModel(lotRow) {
  const activeCheckIns = getActiveCheckInsCount(lotRow.id);
  const remainingSpots = Math.max(0, lotRow.total_spots - activeCheckIns);
  return {
    id: lotRow.id,
    ownerId: lotRow.owner_id,
    name: lotRow.name,
    location: lotRow.location,
    fullAddress: lotRow.full_address,
    price: lotRow.price_per_hour,
    capacity: lotRow.total_spots,
    remainingSpots,
    available: lotRow.status === "approved" && remainingSpots > 0,
    status: lotRow.status,
    allowedVehicleTypes: parseAllowedTypes(lotRow.allowed_vehicle_types),
    lat: lotRow.lat ?? null,
    lng: lotRow.lng ?? null,
  };
}

function getLotForOwner(lotId, ownerId) {
  return db
    .prepare(`SELECT * FROM parking_lots WHERE id = ? AND owner_id = ?`)
    .get(lotId, ownerId);
}

function vehicleToApiModel(row) {
  return {
    id: row.id,
    userId: row.user_id,
    licensePlate: row.license_plate,
    make: row.make,
    model: row.model,
  };
}

initDb();

app.post("/api/auth/login", (req, res) => {
  const { role, displayName = "", userId, identifier, password } = req.body || {};

  if (identifier || password) {
    if (!String(identifier || "").trim() || !String(password || "").trim()) {
      return res.status(400).json({ error: "Email/Username and password are required." });
    }

    const normalizedIdentifier = normalize(identifier);
    const user = db
      .prepare(
        `SELECT id, role, display_name AS displayName, username, email, password_hash AS passwordHash
         FROM users
         WHERE lower(email) = ? OR lower(username) = ?
         LIMIT 1`
      )
      .get(normalizedIdentifier, normalizedIdentifier);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email/username or password." });
    }

    return res.json({
      user: {
        id: user.id,
        role: user.role,
        displayName: user.displayName,
      },
    });
  }

  const normalizedRole = normalize(role);

  if (!["driver", "owner"].includes(normalizedRole)) {
    return res.status(400).json({ error: "Role must be driver or owner." });
  }

  const finalUserId = String(userId || `${normalizedRole}-1`);
  const finalDisplayName = String(displayName || `${normalizedRole} user`).trim();

  db.prepare(
    `INSERT INTO users (id, role, display_name, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET role = excluded.role, display_name = excluded.display_name`
  ).run(finalUserId, normalizedRole, finalDisplayName, nowIso());

  return res.json({
    user: {
      id: finalUserId,
      role: normalizedRole,
      displayName: finalDisplayName,
    },
  });
});

app.get("/api/auth/me", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json(null);

  const user = db
    .prepare(`SELECT id, role, display_name AS displayName FROM users WHERE id = ?`)
    .get(String(userId));

  return res.json(user || null);
});

app.get("/api/parking", (req, res) => {
  const { location = "", carType = "any", lat, lng } = req.query;
  const normalizedCarType = normalize(carType);
  const userLat = lat ? parseFloat(lat) : null;
  const userLng = lng ? parseFloat(lng) : null;

  const normalizedLocation = normalize(location);
  const rows = normalizedLocation
    ? db
        .prepare(
          `SELECT * FROM parking_lots
           WHERE status = 'approved'
             AND (
               lower(name) LIKE ?
               OR lower(location) LIKE ?
               OR lower(full_address) LIKE ?
             )`
        )
        .all(`%${normalizedLocation}%`, `%${normalizedLocation}%`, `%${normalizedLocation}%`)
    : db.prepare(`SELECT * FROM parking_lots WHERE status = 'approved'`).all();

  const lots = rows
    .map(lotToApiModel)
    .filter((lot) => {
      if (!normalizedCarType || normalizedCarType === "any") return true;
      const types = lot.allowedVehicleTypes;
      return types.includes("any") || types.includes(normalizedCarType);
    })
    .map((lot) => {
      if (userLat != null && userLng != null && lot.lat != null && lot.lng != null) {
        lot.distanceMiles = haversineMiles(userLat, userLng, lot.lat, lot.lng);
      } else {
        lot.distanceMiles = null;
      }
      return lot;
    });

  return res.json(lots);
});

app.get("/api/owner/lots", (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) {
    return res.status(400).json({ error: "ownerId required." });
  }

  const lots = db
    .prepare(`SELECT * FROM parking_lots WHERE owner_id = ? ORDER BY id DESC`)
    .all(String(ownerId))
    .map(lotToApiModel);

  return res.json(lots);
});

app.post("/api/register", (req, res) => {
  const {
    ownerId = "owner-1",
    name,
    location,
    fullAddress,
    price,
    capacity,
    allowedVehicleTypes,
    lat,
    lng,
  } = req.body || {};

  if (!name || !location || !price) {
    return res.status(400).json({ error: "Lot name, location, and price are required." });
  }

  const parsedPrice = Number(price);
  if (capacity == null || capacity === "") {
    return res.status(400).json({ error: "Capacity is required." });
  }

  const parsedCapacity = Number(capacity);

  if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
    return res.status(400).json({ error: "Capacity must be at least 1." });
  }
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: "Price must be a valid positive number." });
  }

  if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
    return res.status(400).json({ error: "Capacity must be at least 1." });
  }

  const normalizedTypes = Array.isArray(allowedVehicleTypes) && allowedVehicleTypes.length > 0
    ? allowedVehicleTypes.map((item) => normalize(item)).filter(Boolean)
    : ["any"];

  const result = db.prepare(
    `INSERT INTO parking_lots
      (owner_id, name, location, full_address, price_per_hour, total_spots, status, allowed_vehicle_types, lat, lng, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?)`
  ).run(
    String(ownerId),
    String(name).trim(),
    String(location).trim(),
    String(fullAddress || location).trim(),
    parsedPrice,
    parsedCapacity,
    JSON.stringify(normalizedTypes),
    lat != null ? parseFloat(lat) : null,
    lng != null ? parseFloat(lng) : null,
    nowIso()
  );

  const lot = db.prepare(`SELECT * FROM parking_lots WHERE id = ?`).get(result.lastInsertRowid);

  return res.json({
    message: "Parking lot registered successfully.",
    lot: lotToApiModel(lot),
  });
});

app.patch("/api/owner/lots/:id", (req, res) => {
  const lotId = Number(req.params.id);
  const {
    ownerId,
    name,
    location,
    fullAddress,
    price,
    capacity,
    allowedVehicleTypes,
    lat,
    lng,
  } = req.body || {};

  if (!ownerId) {
    return res.status(400).json({ error: "ownerId required." });
  }

  const existingLot = getLotForOwner(lotId, String(ownerId));
  if (!existingLot) {
    return res.status(404).json({ error: "Lot not found for this owner." });
  }

  const nextName = String(name ?? existingLot.name).trim();
  const nextLocation = String(location ?? existingLot.location).trim();
  const nextFullAddress = String(fullAddress ?? existingLot.full_address).trim();
  const nextPrice = price == null ? Number(existingLot.price_per_hour) : Number(price);
  const nextCapacity = capacity == null ? Number(existingLot.total_spots) : Number(capacity);

  if (!nextName || !nextLocation || !nextFullAddress) {
    return res.status(400).json({ error: "Lot name, location, and address are required." });
  }

  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    return res.status(400).json({ error: "Price must be a valid positive number." });
  }

  if (!Number.isFinite(nextCapacity) || nextCapacity < 1) {
    return res.status(400).json({ error: "Capacity must be at least 1." });
  }

  const normalizedTypes = Array.isArray(allowedVehicleTypes) && allowedVehicleTypes.length > 0
    ? allowedVehicleTypes.map((item) => normalize(item)).filter(Boolean)
    : parseAllowedTypes(existingLot.allowed_vehicle_types);

  const nextLat = lat != null ? parseFloat(lat) : (existingLot.lat ?? null);
  const nextLng = lng != null ? parseFloat(lng) : (existingLot.lng ?? null);

  db.prepare(
    `UPDATE parking_lots
     SET name = ?,
         location = ?,
         full_address = ?,
         price_per_hour = ?,
         total_spots = ?,
         allowed_vehicle_types = ?,
         lat = ?,
         lng = ?
     WHERE id = ? AND owner_id = ?`
  ).run(
    nextName,
    nextLocation,
    nextFullAddress,
    nextPrice,
    nextCapacity,
    JSON.stringify(normalizedTypes),
    nextLat,
    nextLng,
    lotId,
    String(ownerId)
  );

  const lot = db.prepare(`SELECT * FROM parking_lots WHERE id = ?`).get(lotId);
  return res.json({ message: "Parking lot updated successfully.", lot: lotToApiModel(lot) });
});

app.delete("/api/owner/lots/:id", (req, res) => {
  const lotId = Number(req.params.id);
  const ownerId = String(req.query.ownerId || "");

  if (!ownerId) {
    return res.status(400).json({ error: "ownerId required." });
  }

  const existingLot = getLotForOwner(lotId, ownerId);
  if (!existingLot) {
    return res.status(404).json({ error: "Lot not found for this owner." });
  }

  db.prepare(`DELETE FROM parking_lots WHERE id = ? AND owner_id = ?`).run(lotId, ownerId);
  return res.json({ message: "Parking lot deleted successfully." });
});

app.post("/api/payment-method", (req, res) => {
  const { userId, cardHolder, cardNumber, expiry } = req.body || {};

  if (!userId || !cardHolder || !cardNumber || !expiry) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const cleanedCard = String(cardNumber).replace(/\s/g, "");
  if (!/^\d{16}$/.test(cleanedCard)) {
    return res.status(400).json({ error: "Card number must be 16 digits." });
  }

  const masked = `**** **** **** ${cleanedCard.slice(-4)}`;
  const result = db.prepare(
    `INSERT INTO payment_methods (user_id, card_holder, masked, expiry, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(String(userId), String(cardHolder).trim(), masked, String(expiry).trim(), nowIso());

  const method = db
    .prepare(`SELECT id, user_id AS userId, card_holder AS cardHolder, masked, expiry FROM payment_methods WHERE id = ?`)
    .get(result.lastInsertRowid);

  return res.json({ message: "Payment method saved successfully.", method });
});

app.get("/api/payment-method", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required." });

  const methods = db
    .prepare(
      `SELECT id, user_id AS userId, card_holder AS cardHolder, masked, expiry
       FROM payment_methods
       WHERE user_id = ?
       ORDER BY id DESC`
    )
    .all(String(userId));

  return res.json(methods);
});

app.get("/api/vehicles", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required." });

  const vehicles = db
    .prepare(
      `SELECT id, user_id, license_plate, make, model
       FROM vehicles
       WHERE user_id = ?
       ORDER BY id DESC`
    )
    .all(String(userId))
    .map(vehicleToApiModel);

  return res.json(vehicles);
});

app.post("/api/vehicles", (req, res) => {
  const { userId, licensePlate, make, model } = req.body || {};

  if (!userId || !licensePlate || !make || !model) {
    return res.status(400).json({ error: "userId, licensePlate, make, and model are required." });
  }

  const cleanPlate = String(licensePlate).trim().toUpperCase();
  const cleanMake = String(make).trim();
  const cleanModel = String(model).trim();

  if (!/^[A-Z0-9]{1,8}$/.test(cleanPlate)) {
    return res.status(400).json({ error: "Invalid plate number. Only letters and numbers allowed (no special characters)." });
  }
  if (!/^[a-zA-Z\s]{2,}$/.test(cleanMake)) {
    return res.status(400).json({ error: "Invalid make. Only letters allowed." });
  }
  if (!/^[a-zA-Z0-9\s]{2,}$/.test(cleanModel)) {
    return res.status(400).json({ error: "Invalid model. Only letters and numbers allowed." });
  }

  const existing = db
    .prepare(`SELECT id FROM vehicles WHERE user_id = ? AND license_plate = ?`)
    .get(String(userId), cleanPlate);
  if (existing) {
    return res.status(409).json({ error: "A vehicle with this plate number already exists." });
  }

  const result = db
    .prepare(
      `INSERT INTO vehicles (user_id, license_plate, make, model, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(String(userId), cleanPlate, cleanMake, cleanModel, nowIso());

  const vehicle = db
    .prepare(`SELECT id, user_id, license_plate, make, model FROM vehicles WHERE id = ?`)
    .get(result.lastInsertRowid);

  return res.status(201).json({ message: "Vehicle added successfully.", vehicle: vehicleToApiModel(vehicle) });
});

app.delete("/api/vehicles/:id", (req, res) => {
  const vehicleId = Number(req.params.id);
  const userId = String(req.query.userId || "");

  if (!userId) {
    return res.status(400).json({ error: "userId required." });
  }

  const existing = db
    .prepare(`SELECT id FROM vehicles WHERE id = ? AND user_id = ?`)
    .get(vehicleId, userId);
  if (!existing) {
    return res.status(404).json({ error: "Vehicle not found for this user." });
  }

  db.prepare(`DELETE FROM vehicles WHERE id = ? AND user_id = ?`).run(vehicleId, userId);
  return res.json({ message: "Vehicle removed successfully!" });
});

app.post("/api/sessions/start", (req, res) => {
  const { userId, lotName, lotId, hours, vehicleId } = req.body || {};

  if (!userId || (!lotName && !lotId) || !hours || Number(hours) < 1) {
    return res.status(400).json({ error: "userId, lotName (or lotId), and hours are required." });
  }

  const existingSession = db
    .prepare(`SELECT id FROM parking_sessions WHERE user_id = ? AND active = 1`)
    .get(String(userId));
  if (existingSession) {
    return res.status(400).json({ error: "User already has an active parking session." });
  }

  const lot = lotId
    ? db.prepare(`SELECT * FROM parking_lots WHERE id = ?`).get(Number(lotId))
    : db.prepare(`SELECT * FROM parking_lots WHERE lower(name) = ?`).get(normalize(lotName));

  if (!lot || lot.status !== "approved") {
    return res.status(404).json({ error: "Parking lot not found." });
  }

  const availableNow = Math.max(0, lot.total_spots - getActiveCheckInsCount(lot.id));
  if (availableNow < 1) {
    return res.status(400).json({ error: "This parking lot is full." });
  }

  // Seed spots if they haven't been created yet, then find first available
  let spotRows = db.prepare(`SELECT * FROM spots WHERE lot_id = ? ORDER BY id`).all(lot.id);
  if (spotRows.length === 0) {
    seedSpotsForLot(lot);
    spotRows = db.prepare(`SELECT * FROM spots WHERE lot_id = ? ORDER BY id`).all(lot.id);
  }
  const availableSpot = spotRows.find((s) => s.status === "available") ?? null;

  // Optionally look up the selected vehicle (must belong to this user)
  let vehicle = null;
  if (vehicleId) {
    vehicle = db
      .prepare(`SELECT * FROM vehicles WHERE id = ? AND user_id = ?`)
      .get(Number(vehicleId), String(userId));
  }

  // Fetch driver display name for the spot record
  const driverUser = db.prepare(`SELECT display_name FROM users WHERE id = ?`).get(String(userId));
  const driverName = driverUser?.display_name || String(userId);

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + Number(hours) * 60 * 60 * 1000);

  const { sessionRowId } = db.transaction(() => {
    const sessionResult = db.prepare(
      `INSERT INTO parking_sessions
         (user_id, lot_id, lot_name_snapshot, start_time, end_time, active, spot_id)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run(
      String(userId), lot.id, lot.name,
      startTime.toISOString(), endTime.toISOString(),
      availableSpot?.id ?? null
    );

    if (availableSpot) {
      db.prepare(
        `UPDATE spots
         SET status = 'occupied',
             driver_name = ?,
             vehicle_make = ?,
             vehicle_model = ?,
             license_plate = ?,
             session_start_time = ?
         WHERE id = ? AND lot_id = ?`
      ).run(
        driverName,
        vehicle?.make ?? null,
        vehicle?.model ?? null,
        vehicle?.license_plate ?? null,
        startTime.toISOString(),
        availableSpot.id,
        lot.id
      );
    }

    return { sessionRowId: sessionResult.lastInsertRowid };
  })();

  const session = db
    .prepare(
      `SELECT
         id,
         user_id AS userId,
         lot_id AS lotId,
         lot_name_snapshot AS lotName,
         start_time AS startTime,
         end_time AS endTime,
         checked_out_at AS checkedOutAt,
         active
       FROM parking_sessions
       WHERE id = ?`
    )
    .get(sessionRowId);

  const latestLot = db.prepare(`SELECT * FROM parking_lots WHERE id = ?`).get(lot.id);

  return res.json({ message: "Parking session started.", session, lot: lotToApiModel(latestLot) });
});

app.get("/api/sessions/active", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required." });

  const session = db
    .prepare(
      `SELECT
         id,
         user_id AS userId,
         lot_id AS lotId,
         lot_name_snapshot AS lotName,
         start_time AS startTime,
         end_time AS endTime,
         checked_out_at AS checkedOutAt,
         active
       FROM parking_sessions
       WHERE user_id = ? AND active = 1
       LIMIT 1`
    )
    .get(String(userId));

  return res.json(session || null);
});

app.post("/api/sessions/extend", (req, res) => {
  const { userId, extraHours } = req.body || {};

  if (!userId || !extraHours || Number(extraHours) < 1) {
    return res.status(400).json({ error: "userId and extraHours are required." });
  }

  const currentSession = db
    .prepare(`SELECT * FROM parking_sessions WHERE user_id = ? AND active = 1 LIMIT 1`)
    .get(String(userId));
  if (!currentSession) {
    return res.status(404).json({ error: "No active session found." });
  }

  const currentEnd = new Date(currentSession.end_time);
  const updatedEnd = new Date(currentEnd.getTime() + Number(extraHours) * 60 * 60 * 1000).toISOString();

  db.prepare(`UPDATE parking_sessions SET end_time = ? WHERE id = ?`).run(updatedEnd, currentSession.id);

  const session = db
    .prepare(
      `SELECT
         id,
         user_id AS userId,
         lot_id AS lotId,
         lot_name_snapshot AS lotName,
         start_time AS startTime,
         end_time AS endTime,
         checked_out_at AS checkedOutAt,
         active
       FROM parking_sessions
       WHERE id = ?`
    )
    .get(currentSession.id);

  return res.json({ message: "Time extension successful. Session end time updated.", session });
});

app.post("/api/sessions/checkout", (req, res) => {
  const { userId, paymentMethodId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  const methods = db
    .prepare(`SELECT id FROM payment_methods WHERE user_id = ? ORDER BY id DESC`)
    .all(String(userId));
  if (!methods.length) {
    return res.status(400).json({ error: "A payment method is required before checkout." });
  }

  const selectedId = paymentMethodId ? Number(paymentMethodId) : methods[0].id;
  const selectedMethod = db
    .prepare(`SELECT id FROM payment_methods WHERE id = ? AND user_id = ?`)
    .get(selectedId, String(userId));

  if (!selectedMethod) {
    return res.status(400).json({ error: "Selected payment method is invalid." });
  }

  const session = db
    .prepare(`SELECT * FROM parking_sessions WHERE user_id = ? AND active = 1 LIMIT 1`)
    .get(String(userId));
  if (!session) {
    return res.status(404).json({ error: "No active session found." });
  }

  db.transaction(() => {
    db.prepare(
      `UPDATE parking_sessions
       SET active = 0, checked_out_at = ?, payment_method_id = ?
       WHERE id = ?`
    ).run(nowIso(), selectedMethod.id, session.id);

    if (session.spot_id) {
      db.prepare(
        `UPDATE spots
         SET status = 'available',
             driver_name = NULL,
             vehicle_make = NULL,
             vehicle_model = NULL,
             license_plate = NULL,
             session_start_time = NULL
         WHERE id = ? AND lot_id = ?`
      ).run(session.spot_id, session.lot_id);
    }
  })();

  const updatedSession = db
    .prepare(
      `SELECT
         id,
         user_id AS userId,
         lot_id AS lotId,
         lot_name_snapshot AS lotName,
         start_time AS startTime,
         end_time AS endTime,
         checked_out_at AS checkedOutAt,
         active
       FROM parking_sessions
       WHERE id = ?`
    )
    .get(session.id);

  const lot = db.prepare(`SELECT * FROM parking_lots WHERE id = ?`).get(session.lot_id);

  return res.json({
    message: "Check Out Successful!",
    session: updatedSession,
    lot: lot ? lotToApiModel(lot) : null,
  });
});

app.get("/api/announcements", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId required." });
  }

  const rows = db.prepare(`
    SELECT
      a.id,
      a.lot_id AS lotId,
      pl.name AS lotName,
      a.message,
      a.created_at AS createdAt
    FROM announcement_recipients ar
    JOIN announcements a ON a.id = ar.announcement_id
    LEFT JOIN parking_lots pl ON pl.id = a.lot_id
    WHERE ar.user_id = ?
    ORDER BY a.created_at DESC
  `).all(String(userId));

  return res.json(rows);
});

app.get("/api/announcements/active-count", (req, res) => {
  const { ownerId, lotId } = req.query;
  if (!ownerId || !lotId) {
    return res.status(400).json({ error: "ownerId and lotId are required." });
  }

  const lot = getLotForOwner(Number(lotId), String(ownerId));
  if (!lot) {
    return res.status(404).json({ error: "Lot not found for this owner." });
  }

  const count = getActiveCheckInsCount(Number(lotId));
  return res.json({ count });
});

app.post("/api/announcements/send", (req, res) => {
  const { ownerId, lotId, message } = req.body || {};
  if (!ownerId || !lotId || !String(message || "").trim()) {
    return res.status(400).json({ error: "ownerId, lotId, and message are required." });
  }

  const lot = getLotForOwner(Number(lotId), String(ownerId));
  if (!lot) {
    return res.status(404).json({ error: "Lot not found for this owner." });
  }

  const recipientRows = db
    .prepare(`SELECT DISTINCT user_id AS userId FROM parking_sessions WHERE lot_id = ? AND active = 1`)
    .all(Number(lotId));

  if (!recipientRows.length) {
    return res.status(400).json({ error: "No active parkers in the selected lot." });
  }

  const tx = db.transaction(() => {
    const announcementResult = db.prepare(
      `INSERT INTO announcements (owner_id, lot_id, message, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(String(ownerId), Number(lotId), String(message).trim(), nowIso());

    const insertRecipient = db.prepare(
      `INSERT INTO announcement_recipients (announcement_id, user_id, delivered_at)
       VALUES (?, ?, ?)`
    );

    for (const row of recipientRows) {
      insertRecipient.run(announcementResult.lastInsertRowid, row.userId, nowIso());
    }

    return {
      announcementId: announcementResult.lastInsertRowid,
      recipients: recipientRows.length,
    };
  });

  const result = tx();

  return res.json({
    message: "Announcement sent.",
    announcementId: result.announcementId,
    recipients: result.recipients,
  });
});

// ── Spot helpers ──────────────────────────────────────────
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

function spotToApiModel(row) {
  return {
    id: row.id,
    lotId: row.lot_id,
    vehicleType: row.vehicle_type,
    status: row.status,
    timeLimitMinutes: row.time_limit_minutes ?? null,
    overrideReason: row.override_reason ?? null,
    driverName: row.driver_name ?? null,
    vehicleMake: row.vehicle_make ?? null,
    vehicleModel: row.vehicle_model ?? null,
    licensePlate: row.license_plate ?? null,
    sessionStartTime: row.session_start_time ?? null,
  };
}

function seedSpotsForLot(lot) {
  const capacity = Math.max(1, Number(lot.total_spots) || 1);
  const vehicleTypes = parseAllowedTypes(lot.allowed_vehicle_types);
  const insertSpot = db.prepare(
    `INSERT OR IGNORE INTO spots (id, lot_id, vehicle_type, status) VALUES (?, ?, ?, 'available')`
  );
  const tx = db.transaction(() => {
    for (let i = 0; i < capacity; i++) {
      const rowLetter = String.fromCharCode(65 + Math.floor(i / 10));
      const rowNumber = (i % 10) + 1;
      const spotId = `${rowLetter}${rowNumber}`;
      const rawType = vehicleTypes[i % vehicleTypes.length];
      const vehicleType = toVehicleLabel(rawType);
      insertSpot.run(spotId, lot.id, vehicleType);
    }
  });
  tx();
}

// ── GET /api/lots/:lotId/spots ────────────────────────────
app.get("/api/lots/:lotId/spots", (req, res) => {
  const lotId = Number(req.params.lotId);
  const ownerId = String(req.query.ownerId || "");

  if (!ownerId) {
    return res.status(400).json({ error: "ownerId required." });
  }

  const lot = getLotForOwner(lotId, ownerId);
  if (!lot) {
    return res.status(404).json({ error: "Lot not found for this owner." });
  }

  let rows = db.prepare(`SELECT * FROM spots WHERE lot_id = ? ORDER BY id`).all(lotId);
  if (rows.length === 0) {
    seedSpotsForLot(lot);
    rows = db.prepare(`SELECT * FROM spots WHERE lot_id = ? ORDER BY id`).all(lotId);
  }

  return res.json(rows.map(spotToApiModel));
});

// ── POST /api/lots/:lotId/spots ───────────────────────────
app.post("/api/lots/:lotId/spots", (req, res) => {
  const lotId = Number(req.params.lotId);
  const { ownerId, spotId, vehicleType } = req.body || {};

  if (!ownerId) {
    return res.status(400).json({ error: "ownerId required." });
  }
  const cleanSpotId = String(spotId || "").trim();
  if (!cleanSpotId) {
    return res.status(400).json({ error: "spotId is required." });
  }

  const ALLOWED_VEHICLE_TYPES = ["Car", "Motorcycle", "EV", "All"];
  const cleanVehicleType = String(vehicleType || "All").trim();
  if (!ALLOWED_VEHICLE_TYPES.includes(cleanVehicleType)) {
    return res.status(400).json({ error: `vehicleType must be one of: ${ALLOWED_VEHICLE_TYPES.join(", ")}.` });
  }

  const lot = getLotForOwner(lotId, String(ownerId));
  if (!lot) {
    return res.status(404).json({ error: "Lot not found for this owner." });
  }

  // Ensure lot is seeded before adding a new spot
  const existingCount = db.prepare(`SELECT COUNT(*) AS count FROM spots WHERE lot_id = ?`).get(lotId).count;
  if (existingCount === 0) seedSpotsForLot(lot);

  const duplicate = db.prepare(`SELECT id FROM spots WHERE id = ? AND lot_id = ?`).get(cleanSpotId, lotId);
  if (duplicate) {
    return res.status(409).json({ error: `Spot "${cleanSpotId}" already exists in this lot.` });
  }

  db.prepare(
    `INSERT INTO spots (id, lot_id, vehicle_type, status) VALUES (?, ?, ?, 'available')`
  ).run(cleanSpotId, lotId, cleanVehicleType);

  const row = db.prepare(`SELECT * FROM spots WHERE id = ? AND lot_id = ?`).get(cleanSpotId, lotId);
  return res.status(201).json(spotToApiModel(row));
});

// ── DELETE /api/lots/:lotId/spots ─────────────────────────
app.delete("/api/lots/:lotId/spots", (req, res) => {
  const lotId = Number(req.params.lotId);
  const { ownerId, spotIds } = req.body || {};

  if (!ownerId) {
    return res.status(400).json({ error: "ownerId required." });
  }
  if (!Array.isArray(spotIds) || spotIds.length === 0) {
    return res.status(400).json({ error: "spotIds must be a non-empty array." });
  }

  const lot = getLotForOwner(lotId, String(ownerId));
  if (!lot) {
    return res.status(404).json({ error: "Lot not found for this owner." });
  }

  const cleanIds = spotIds.map(String);
  const placeholders = cleanIds.map(() => "?").join(", ");

  const occupiedRows = db
    .prepare(`SELECT id FROM spots WHERE lot_id = ? AND id IN (${placeholders}) AND status = 'occupied'`)
    .all(lotId, ...cleanIds);

  if (occupiedRows.length > 0) {
    const ids = occupiedRows.map((r) => r.id).join(", ");
    return res.status(400).json({ error: `Cannot remove occupied spots: ${ids}.` });
  }

  const result = db.transaction(() =>
    db.prepare(`DELETE FROM spots WHERE lot_id = ? AND id IN (${placeholders})`).run(lotId, ...cleanIds)
  )();

  return res.json({ message: "Spots removed.", deleted: result.changes });
});

// ── POST /api/signup ──────────────────────────────────────
app.post("/api/signup", (req, res) => {
  const { email, password, role } = req.body || {};

  if (!String(email || "").trim()) {
    return res.status(400).json({ error: "Email is required." });
  }
  if (!String(password || "").trim()) {
    return res.status(400).json({ error: "Password is required." });
  }
  const normalizedRole = normalize(role);
  if (!["driver", "owner"].includes(normalizedRole)) {
    return res.status(400).json({ error: "Role must be 'driver' or 'owner'." });
  }

  const normalizedEmail = normalize(email);
  const existing = db.prepare(`SELECT id FROM users WHERE lower(email) = ?`).get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const localPart = normalizedEmail.split("@")[0] || "user";
  const displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);

  let username = localPart;
  const usernameTaken = db.prepare(`SELECT id FROM users WHERE lower(username) = ?`).get(username);
  if (usernameTaken) {
    username = `${localPart}_${Date.now()}`;
  }

  const newId = crypto.randomUUID();
  const passwordHash = hashPassword(String(password));

  db.prepare(
    `INSERT INTO users (id, role, display_name, username, email, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(newId, normalizedRole, displayName, username, normalizedEmail, passwordHash, nowIso());

  return res.status(201).json({
    user: { id: newId, role: normalizedRole, displayName },
  });
});

if (require.main === module) {
  app.listen(5000, () => console.log("Server running on port 5000"));
}

module.exports = app;