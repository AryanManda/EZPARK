// src/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "./api/parkingApi";

function Login({ onLogin, user }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "driver") {
      navigate("/driver/find-parking", { replace: true });
    } else if (user?.role === "owner") {
      navigate("/owner/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const loggedInUser = await loginUser({ identifier, password });
      onLogin(loggedInUser);
      if (loggedInUser?.role === "driver") navigate("/driver/find-parking");
      else navigate("/owner/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to log in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2 className="section-title">Log in</h2>
      <p className="section-help">
        Sign in with your email/username and password.
      </p>

      <form onSubmit={handleSubmit} className="form-vertical">
        <label className="field">
          <span className="field-label">Email/Username</span>
          <input
            className="input"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
            }}
            placeholder="driver@test.com"
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="password123"
            autoComplete="current-password"
          />
        </label>

        <p className="field-hint">
          Demo accounts: driver@test.com / password123 and owner@test.com / password123.
        </p>

        {error && <div className="alert error">{error}</div>}

        <button type="submit" className="btn primary">
          {loading ? "Signing in..." : "Log In"}
        </button>

        <p className="field-hint">
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "var(--gold)", textDecoration: "underline" }}>
            Sign up
          </Link>
        </p>
      </form>
    </section>
  );
}

export default Login;