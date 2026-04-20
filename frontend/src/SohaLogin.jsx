// SOHA - UC-01: Login
import { useState } from "react";

export default function SohaLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async () => {
    if (!email && !password) return setMsg("All fields are required.");
    if (!email) return setMsg("Email is required.");
    if (!password) return setMsg("Password is required.");

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error);
      } else {
        setMsg("Login successful!");
        if (onLogin) onLogin();
      }
    } catch {
      setMsg("Server error. Please try again.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "80px auto", padding: "30px",
      border: "1px solid #ddd", borderRadius: "10px", textAlign: "center" }}>
      <h2>EZPark Login</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "10px", margin: "8px 0", borderRadius: "6px", border: "1px solid #ccc" }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "10px", margin: "8px 0", borderRadius: "6px", border: "1px solid #ccc" }}
      />
      <button onClick={handleLogin}
        style={{ width: "100%", padding: "10px", marginTop: "10px",
          backgroundColor: "#f5a623", border: "none", borderRadius: "6px",
          color: "white", fontWeight: "bold", cursor: "pointer" }}>
        Login
      </button>
      {msg && <p style={{ marginTop: "10px", color: msg.includes("successful") ? "green" : "red" }}>{msg}</p>}
    </div>
  );
}
