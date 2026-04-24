import axios from "axios";

const API_BASE = "http://localhost:5000/api";
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === "true";

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

export async function getParking(location) {
  if (USE_SUPABASE) return supabaseGetParking(location);
  const res = await http.get(`/parking?location=${encodeURIComponent(location)}`);
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
