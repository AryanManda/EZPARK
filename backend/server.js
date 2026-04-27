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

    CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON parking_sessions(user_id, active);
    CREATE INDEX IF NOT EXISTS idx_sessions_lot_active ON parking_sessions(lot_id, active);
    CREATE INDEX IF NOT EXISTS idx_lots_owner ON parking_lots(owner_id);
  `);

  ensureUserAuthColumns();

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
  }
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
  };
}

function getLotForOwner(lotId, ownerId) {
  return db
    .prepare(`SELECT * FROM parking_lots WHERE id = ? AND owner_id = ?`)
    .get(lotId, ownerId);
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
  const { location = "", carType = "any" } = req.query;
  const normalizedCarType = normalize(carType);

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
  } = req.body || {};

  if (!name || !location || !price) {
    return res.status(400).json({ error: "Lot name, location, and price are required." });
  }

  const parsedPrice = Number(price);
  const parsedCapacity = capacity ? Number(capacity) : 1;

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
      (owner_id, name, location, full_address, price_per_hour, total_spots, status, allowed_vehicle_types, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?)`
  ).run(
    String(ownerId),
    String(name).trim(),
    String(location).trim(),
    String(fullAddress || location).trim(),
    parsedPrice,
    parsedCapacity,
    JSON.stringify(normalizedTypes),
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

  db.prepare(
    `UPDATE parking_lots
     SET name = ?,
         location = ?,
         full_address = ?,
         price_per_hour = ?,
         total_spots = ?,
         allowed_vehicle_types = ?
     WHERE id = ? AND owner_id = ?`
  ).run(
    nextName,
    nextLocation,
    nextFullAddress,
    nextPrice,
    nextCapacity,
    JSON.stringify(normalizedTypes),
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

app.post("/api/sessions/start", (req, res) => {
  const { userId, lotName, lotId, hours } = req.body || {};

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

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + Number(hours) * 60 * 60 * 1000);

  const result = db.prepare(
    `INSERT INTO parking_sessions (user_id, lot_id, lot_name_snapshot, start_time, end_time, active)
     VALUES (?, ?, ?, ?, ?, 1)`
  ).run(String(userId), lot.id, lot.name, startTime.toISOString(), endTime.toISOString());

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
    .get(result.lastInsertRowid);

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

  db.prepare(
    `UPDATE parking_sessions
     SET active = 0, checked_out_at = ?, payment_method_id = ?
     WHERE id = ?`
  ).run(nowIso(), selectedMethod.id, session.id);

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
      a.message,
      a.created_at AS createdAt,
      a.lot_id AS lotId
    FROM announcement_recipients ar
    JOIN announcements a ON a.id = ar.announcement_id
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

if (require.main === module) {
  app.listen(5000, () => console.log("Server running on port 5000"));
}

module.exports = app;
