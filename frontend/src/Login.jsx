// src/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login({ onLogin, user }) {
  const [role, setRole] = useState("driver");
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "driver") {
      navigate("/driver/find-parking", { replace: true });
    } else if (user?.role === "owner") {
      navigate("/owner/register-lot", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ role, id: `${role}-1` });
    if (role === "driver") navigate("/driver/find-parking");
    else navigate("/owner/register-lot");
  };

  return (
    <section className="panel">
      <h2 className="section-title">Log in</h2>
      <p className="section-help">
        Choose how you want to use the system.
      </p>

      <form onSubmit={handleSubmit} className="form-vertical">
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

        <button type="submit" className="btn primary">
          Continue
        </button>
      </form>
    </section>
  );
}

export default Login;