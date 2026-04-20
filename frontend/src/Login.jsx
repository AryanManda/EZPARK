// src/Login.jsx - SOHA UC-01: Login
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const users = [
  { id: 1, email: "driver@gmail.com", password: "pass123", role: "driver" },
  { id: 2, email: "owner@gmail.com", password: "pass123", role: "owner" },
];

function Login({ onLogin, user }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("driver");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email && !password) return setMsg("All fields are required.");
    if (!email) return setMsg("Email is required.");
    if (!password) return setMsg("Password is required.");

    const found = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!found) return setMsg("Invalid email or password.");

    setMsg("");
    onLogin({ role: found.role, id: `${found.role}-1` });
    if (found.role === "driver") navigate("/driver/find-parking");
    else navigate("/owner/register-lot");
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (!email || !password) return setMsg("All fields are required.");
    setMsg("Account created! You can now log in.");
    setMode("login");
  };

  return (
    <section className="panel" style={{ maxWidth: "420px", margin: "0 auto" }}>
      <h2 className="section-title">
        {mode === "login" ? "Log In" : "Sign Up"}
      </h2>
      <p className="section-help">
        {mode === "login"
          ? "Welcome back to EZPark."
          : "Create your EZPark account."}
      </p>

      <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="form-vertical">
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          <p style={{ color: msg.includes("created") ? "green" : "red", margin: "4px 0" }}>
            {msg}
          </p>
        )}

        <button type="submit" className="btn primary">
          {mode === "login" ? "Log In" : "Sign Up"}
        </button>
      </form>

      <p className="section-help" style={{ marginTop: "16px" }}>
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <span
              onClick={() => { setMode("signup"); setMsg(""); }}
              style={{ color: "#f5a623", cursor: "pointer", fontWeight: "bold" }}
            >
              Sign Up
            </span>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <span
              onClick={() => { setMode("login"); setMsg(""); }}
              style={{ color: "#f5a623", cursor: "pointer", fontWeight: "bold" }}
            >
              Log In
            </span>
          </>
        )}
      </p>
    </section>
  );
}

export default Login;
