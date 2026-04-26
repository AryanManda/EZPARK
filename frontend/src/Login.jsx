// src/Login.jsx - SOHA UC-01: Login
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

let registeredUsers = [
  { id: 1, email: "driver@gmail.com", password: "pass123", role: "driver" },
  { id: 2, email: "owner@gmail.com", password: "pass123", role: "owner" },
  { id: 3, email: "soha@gmail.com", password: "pass123", role: "driver" },
  { id: 4, email: "demo@gmail.com", password: "pass123", role: "owner" },
];

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("driver");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const navigate = useNavigate();

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (p) => p.length >= 6;

  const handleLogin = (e) => {
    e.preventDefault();
    setMsg("");
    if (!email && !password) return setMsg("All fields are required.");
    if (!email) return setMsg("Email is required.");
    if (!validateEmail(email)) return setMsg("Please enter a valid email address.");
    if (!password) return setMsg("Password is required.");
    if (!validatePassword(password)) return setMsg("Password must be at least 6 characters.");

    const found = registeredUsers.find(
      (u) => u.email === email && u.password === password
    );
    if (!found) return setMsg("Invalid email or password. Please try again.");

    setMsgType("success");
    setMsg("Login successful!");
    onLogin({ role: found.role, id: `${found.role}-1` });
    if (found.role === "driver") navigate("/driver/find-parking");
    else navigate("/owner/register-lot");
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setMsg("");
    if (!email && !password) return setMsg("All fields are required.");
    if (!email) return setMsg("Email is required.");
    if (!validateEmail(email)) return setMsg("Please enter a valid email address (e.g. name@email.com).");
    if (!password) return setMsg("Password is required.");
    if (!validatePassword(password)) return setMsg("Password must be at least 6 characters.");

    const exists = registeredUsers.find((u) => u.email === email);
    if (exists) return setMsg("An account with this email already exists.");

    registeredUsers.push({ id: Date.now(), email, password, role });
    setMsgType("success");
    setMsg("Account created! You can now log in.");
    setMode("login");
    setEmail("");
    setPassword("");
  };

  return (
    <section className="panel" style={{ maxWidth: "420px", margin: "0 auto" }}>
      <h2 className="section-title">
        {mode === "login" ? "Log In" : "Sign Up"}
      </h2>
      <p className="section-help">
        {mode === "login" ? "Welcome back to EZPark." : "Create your EZPark account."}
      </p>

      <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="form-vertical">
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="input"
            type="text"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setMsg(""); }}
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setMsg(""); }}
          />
        </label>

        {mode === "signup" && (
          <label className="field">
            <span className="field-label">Role</span>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="driver">Driver (Find parking)</option>
              <option value="owner">Owner (Register lot)</option>
            </select>
          </label>
        )}

        {msg && (
          <p style={{ color: msgType === "success" ? "#4caf50" : "#e53935", margin: "4px 0", fontSize: "14px" }}>
            {msg}
          </p>
        )}

        <button type="submit" className="btn primary">
          {mode === "login" ? "Log In" : "Sign Up"}
        </button>
      </form>

      <p className="section-help" style={{ marginTop: "16px" }}>
        {mode === "login" ? (
          <>Don't have an account?{" "}
            <span onClick={() => { setMode("signup"); setMsg(""); }}
              style={{ color: "#f5a623", cursor: "pointer", fontWeight: "bold" }}>
              Sign Up
            </span>
          </>
        ) : (
          <>Already have an account?{" "}
            <span onClick={() => { setMode("login"); setMsg(""); }}
              style={{ color: "#f5a623", cursor: "pointer", fontWeight: "bold" }}>
              Log In
            </span>
          </>
        )}
      </p>
    </section>
  );
}

export default Login;
