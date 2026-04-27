// src/SignUp.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "./api/parkingApi";

function SignUp({ onLogin, user }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("driver");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
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
      const newUser = await signupUser({ email, password, role });
      onLogin(newUser);
      if (newUser?.role === "driver") navigate("/driver/find-parking");
      else navigate("/owner/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2 className="section-title">Create Account</h2>
      <p className="section-help">
        Sign up for a free EZPark account.
      </p>

      <form onSubmit={handleSubmit} className="form-vertical">
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Choose a password"
            autoComplete="new-password"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">I am a…</span>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="driver">Driver</option>
            <option value="owner">Parking Lot Owner</option>
          </select>
        </label>

        {error && <div className="alert error">{error}</div>}

        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? "Creating account…" : "Sign Up"}
        </button>

        <p className="field-hint">
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--gold)", textDecoration: "underline" }}>
            Log in
          </Link>
        </p>
      </form>
    </section>
  );
}

export default SignUp;
