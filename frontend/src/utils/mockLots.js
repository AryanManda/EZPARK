// src/utils/mockLots.js
// Shared mock data for all owner lot pages

const now = Date.now();
const minutesAgoIso = (mins) => new Date(now - mins * 60 * 1000).toISOString();

export const INITIAL_LOTS = [
  {
    id: "lot-1",
    name: "Downtown Plaza",
    address: "123 Main St, Downtown",
    defaultTimeLimitMinutes: null,
    metrics: {
      totalRevenue: "$1,500",
      occupants: 12,
      reservations: 8,
      availableSpots: 6,
    },
    pricingRules: {
      baseRate: 2.5,
      durationMultiplier: 1.0,
      durationDiscountAfterHours: 4,
      durationDiscountPercent: 10,
      dailyMaximum: null,
      minimumCharge: null,
      vehicleTypeMultipliers: { car: 1.0, motorcycle: 0.5, ev: 1.2 },
    },
    spots: [
      { id: "A1", status: "occupied",  vehicleType: "Car",        timeLimitMinutes: 120, driver: "Marcus Webb",    car: "Tesla Model 3",    plate: "ABC-1234", time: "2h 15m", sessionStartIso: minutesAgoIso(135) },
      { id: "A2", status: "available", vehicleType: "All",        timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "A3", status: "reserved",  vehicleType: "Car",        timeLimitMinutes: 60,  driver: "Priya Kapoor",   car: "Honda Civic",      plate: "XYZ-5678", time: "Starts 3:30 PM" },
      { id: "A4", status: "occupied",  vehicleType: "Car",        timeLimitMinutes: null, driver: "James Rivera",  car: "Ford F-150",       plate: "LMN-9012", time: "45m", sessionStartIso: minutesAgoIso(45) },
      { id: "A5", status: "available", vehicleType: "Motorcycle", timeLimitMinutes: 30,  driver: null,            car: null,               plate: null,       time: null },
      { id: "A6", status: "reserved",  vehicleType: "Car",        timeLimitMinutes: 120, driver: "Aisha Thompson", car: "Chevy Malibu",    plate: "QRS-3456", time: "Starts 4:00 PM" },
      { id: "B1", status: "available", vehicleType: "All",        timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "B2", status: "available", vehicleType: "EV",         timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "B3", status: "occupied",  vehicleType: "Car",        timeLimitMinutes: 120, driver: "Sarah Kim",      car: "BMW 3 Series",     plate: "WXY-2345", time: "3h 05m", sessionStartIso: minutesAgoIso(185) },
      { id: "B4", status: "available", vehicleType: "EV",         timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "B5", status: "occupied",  vehicleType: "Car",        timeLimitMinutes: 60,  driver: "Derek Jones",    car: "Dodge Charger",    plate: "ZAB-6789", time: "55m", sessionStartIso: minutesAgoIso(55) },
      { id: "B6", status: "reserved",  vehicleType: "Car",        timeLimitMinutes: null, driver: "Nina Patel",    car: "Kia Sportage",     plate: "CDE-0123", time: "Starts 5:00 PM" },
      { id: "C1", status: "occupied",  vehicleType: "Car",        timeLimitMinutes: 120, driver: "Omar Hassan",   car: "Mercedes C-Class", plate: "FGH-4567", time: "2h 40m", sessionStartIso: minutesAgoIso(160) },
      { id: "C2", status: "available", vehicleType: "Motorcycle", timeLimitMinutes: 30,  driver: null,            car: null,               plate: null,       time: null },
      { id: "C3", status: "available", vehicleType: "All",        timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "C4", status: "occupied",  vehicleType: "Car",        timeLimitMinutes: 120, driver: "Zoe Martinez",   car: "Nissan Altima",    plate: "IJK-8901", time: "1h 10m", sessionStartIso: minutesAgoIso(70) },
      { id: "C5", status: "reserved",  vehicleType: "EV",         timeLimitMinutes: null, driver: "Ben Chang",     car: "Hyundai Elantra",  plate: "LMO-2345", time: "Starts 6:00 PM" },
      { id: "C6", status: "available", vehicleType: "All",        timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
    ],
    reservations: [
      { id: "RES-001", driver: "Marcus Webb", spot: "A1", start: "Apr 19, 10:00 AM", end: "Apr 19, 12:00 PM", status: "Active" },
      { id: "RES-002", driver: "Priya Kapoor", spot: "A3", start: "Apr 19, 3:30 PM", end: "Apr 19, 5:00 PM", status: "Upcoming" },
      { id: "RES-003", driver: "Aisha Thompson", spot: "A6", start: "Apr 19, 4:00 PM", end: "Apr 19, 6:00 PM", status: "Upcoming" },
    ],
  },
  {
    id: "lot-2",
    name: "Northside Garage",
    address: "88 Summit Ave, Northside",
    defaultTimeLimitMinutes: null,
    metrics: {
      totalRevenue: "$820",
      occupants: 5,
      reservations: 3,
      availableSpots: 4,
    },
    pricingRules: {
      baseRate: 3.0,
      durationMultiplier: 1.0,
      durationDiscountAfterHours: 3,
      durationDiscountPercent: 15,
      dailyMaximum: null,
      minimumCharge: null,
      vehicleTypeMultipliers: { car: 1.0, motorcycle: 0.5, ev: 1.2 },
    },
    spots: [
      { id: "A1", status: "occupied",  vehicleType: "Car",        timeLimitMinutes: 60,  driver: "Tom Bradley",   car: "Subaru Outback",   plate: "AAA-0001", time: "30m", sessionStartIso: minutesAgoIso(30) },
      { id: "A2", status: "available", vehicleType: "All",        timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "A3", status: "occupied",  vehicleType: "EV",         timeLimitMinutes: null, driver: "Susan Park",    car: "Chevy Bolt",       plate: "BBB-0002", time: "1h 05m", sessionStartIso: minutesAgoIso(65) },
      { id: "A4", status: "available", vehicleType: "Motorcycle", timeLimitMinutes: 30,  driver: null,            car: null,               plate: null,       time: null },
      { id: "A5", status: "reserved",  vehicleType: "Car",        timeLimitMinutes: 120, driver: "Jake O'Brien",  car: "Honda CR-V",       plate: "CCC-0003", time: "Starts 2:00 PM" },
      { id: "A6", status: "available", vehicleType: "All",        timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "B1", status: "occupied",  vehicleType: "Car",        timeLimitMinutes: 240, driver: "Mia Chen",      car: "Toyota RAV4",      plate: "DDD-0004", time: "2h 00m", sessionStartIso: minutesAgoIso(120) },
      { id: "B2", status: "available", vehicleType: "EV",         timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "B3", status: "reserved",  vehicleType: "Car",        timeLimitMinutes: 60,  driver: "Rachel Green",  car: "Ford Escape",      plate: "EEE-0005", time: "Starts 4:30 PM" },
      { id: "B4", status: "available", vehicleType: "All",        timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
      { id: "B5", status: "occupied",  vehicleType: "Motorcycle", timeLimitMinutes: 30,  driver: "Luis Gomez",    car: "Yamaha MT-07",     plate: "FFF-0006", time: "15m", sessionStartIso: minutesAgoIso(15) },
      { id: "B6", status: "available", vehicleType: "All",        timeLimitMinutes: null, driver: null,            car: null,               plate: null,       time: null },
    ],
    reservations: [
      { id: "RES-101", driver: "Tom Bradley", spot: "A1", start: "Apr 19, 9:45 AM", end: "Apr 19, 11:00 AM", status: "Active" },
      { id: "RES-102", driver: "Rachel Green", spot: "B3", start: "Apr 19, 4:30 PM", end: "Apr 19, 5:30 PM", status: "Upcoming" },
      { id: "RES-103", driver: "Mia Chen", spot: "B1", start: "Apr 18, 8:00 AM", end: "Apr 18, 12:00 PM", status: "Completed" },
    ],
  },
];
