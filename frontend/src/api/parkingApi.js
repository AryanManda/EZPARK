import axios from "axios";

const API_BASE = "http://localhost:5000/api";
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === "true";
const AUTH_STORAGE_KEY = "ezpark-auth-user";

const http = axios.create({
  baseURL: API_BASE,
});

function createNotImplementedError(action) {
  return new Error(
    `${action} is not implemented for Supabase yet. Set VITE_USE_SUPABASE=false to use backend API for now.`
  );
}

async function supabaseGetParking(_location) {
  throw createNotImplementedError("Searching parking");
}

async function supabaseGetActiveSession(_userId) {
  throw createNotImplementedError("Loading active session");
}

async function supabaseStartSession(_payload) {
  throw createNotImplementedError("Starting parking session");
}

async function supabaseExtendSession(_payload) {
  throw createNotImplementedError("Extending parking session");
}

async function supabaseCheckoutSession(_payload) {
  throw createNotImplementedError("Checking out session");
}

async function supabaseGetPaymentMethods(_userId) {
  throw createNotImplementedError("Loading payment methods");
}

async function supabaseAddPaymentMethod(_payload) {
  throw createNotImplementedError("Adding payment method");
}

export async function getParking(location = "") {
  if (USE_SUPABASE) return supabaseGetParking(location);
  const res = await http.get(`/parking?location=${encodeURIComponent(location)}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getParkingWithFilters({ location, carType = "any", lat, lng }) {
  if (USE_SUPABASE) return supabaseGetParking(location);
  const params = new URLSearchParams({ location: location ?? "", carType });
  if (lat != null) params.set("lat", lat);
  if (lng != null) params.set("lng", lng);
  const res = await http.get(`/parking?${params.toString()}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getActiveSession(userId) {
  if (USE_SUPABASE) return supabaseGetActiveSession(userId);
  const res = await http.get(`/sessions/active?userId=${userId}`);
  return res.data;
}

export async function startSession(payload) {
  if (USE_SUPABASE) return supabaseStartSession(payload);
  const res = await http.post("/sessions/start", payload);
  return res.data;
}

export async function extendSession(payload) {
  if (USE_SUPABASE) return supabaseExtendSession(payload);
  const res = await http.post("/sessions/extend", payload);
  return res.data;
}

export async function checkoutSession(payload) {
  if (USE_SUPABASE) return supabaseCheckoutSession(payload);
  const res = await http.post("/sessions/checkout", payload);
  return res.data;
}

export async function getPaymentMethods(userId) {
  if (USE_SUPABASE) return supabaseGetPaymentMethods(userId);
  const res = await http.get(`/payment-method?userId=${userId}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function addPaymentMethod(payload) {
  if (USE_SUPABASE) return supabaseAddPaymentMethod(payload);
  const res = await http.post("/payment-method", payload);
  return res.data;
}

export async function loginUser({ identifier, password }) {
  const res = await http.post("/auth/login", { identifier, password });
  const user = res.data?.user || null;
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
  return user;
}

export async function loginWithRole({ role, displayName = "", userId }) {
  const res = await http.post("/auth/login", { role, displayName, userId });
  const user = res.data?.user || null;
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
  return user;
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function getAuthSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const stored = JSON.parse(raw);
    if (!stored?.id) return null;
    const res = await http.get(`/auth/me?userId=${encodeURIComponent(stored.id)}`);
    if (!res.data) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    const user = {
      id: res.data.id,
      role: res.data.role,
      displayName: res.data.displayName,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export async function getOwnerLots(ownerId) {
  const res = await http.get(`/owner/lots?ownerId=${encodeURIComponent(ownerId)}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function registerParkingLot(payload) {
  const res = await http.post("/register", payload);
  return res.data;
}

export async function updateOwnerLot(lotId, payload) {
  const res = await http.patch(`/owner/lots/${encodeURIComponent(lotId)}`, payload);
  return res.data;
}

export async function deleteOwnerLot(lotId, ownerId) {
  const res = await http.delete(
    `/owner/lots/${encodeURIComponent(lotId)}?ownerId=${encodeURIComponent(ownerId)}`
  );
  return res.data;
}

export async function getDriverAnnouncements(userId) {
  const res = await http.get(`/announcements?userId=${encodeURIComponent(userId)}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getAnnouncementActiveCount({ ownerId, lotId }) {
  const res = await http.get(
    `/announcements/active-count?ownerId=${encodeURIComponent(ownerId)}&lotId=${encodeURIComponent(lotId)}`
  );
  return Number(res.data?.count || 0);
}

export async function sendAnnouncementToLot(payload) {
  const res = await http.post("/announcements/send", payload);
  return res.data;
}

export async function getLotSpots(lotId, ownerId) {
  const res = await http.get(
    `/lots/${encodeURIComponent(lotId)}/spots?ownerId=${encodeURIComponent(ownerId)}`
  );
  return Array.isArray(res.data) ? res.data : [];
}

export async function addLotSpot(lotId, payload) {
  const res = await http.post(`/lots/${encodeURIComponent(lotId)}/spots`, payload);
  return res.data;
}

export async function deleteLotSpots(lotId, payload) {
  const res = await http.delete(`/lots/${encodeURIComponent(lotId)}/spots`, { data: payload });
  return res.data;
}

export async function signupUser({ email, password, role }) {
  const res = await http.post("/signup", { email, password, role });
  const user = res.data?.user || null;
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
  return user;
}

export async function getVehicles(userId) {
  const res = await http.get(`/vehicles?userId=${encodeURIComponent(userId)}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function addVehicle(payload) {
  const res = await http.post("/vehicles", payload);
  return res.data;
}

export async function deleteVehicleById(vehicleId, userId) {
  const res = await http.delete(
    `/vehicles/${encodeURIComponent(vehicleId)}?userId=${encodeURIComponent(userId)}`
  );
  return res.data;
}