// SOHA - UC-06: Manage Vehicles
import { useState } from "react";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("");
  const [msg, setMsg] = useState("");

  const addVehicle = async () => {
    if (!plate || !type) return setMsg("All fields are required.");
    try {
      const res = await fetch("http://localhost:5000/api/vehicles/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licensePlate: plate, type })
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error);
      } else {
        setMsg("Vehicle added!");
        setVehicles([...vehicles, data.vehicle]);
        setPlate("");
        setType("");
      }
    } catch {
      setMsg("Server error.");
    }
  };

  const deleteVehicle = async (id) => {
    await fetch(`http://localhost:5000/api/vehicles/delete/${id}`, { method: "DELETE" });
    setVehicles(vehicles.filter((v) => v.id !== id));
    setMsg("Vehicle removed.");
  };

  const inputStyle = { width: "100%", padding: "10px", margin: "8px 0", borderRadius: "6px", border: "1px solid #ccc" };

  return (
    <div style={{ maxWidth: "400px", margin: "80px auto", padding: "30px",
      border: "1px solid #ddd", borderRadius: "10px", textAlign: "center" }}>
      <h2>Manage Vehicles</h2>
      <input placeholder="Plate Number" value={plate} onChange={(e) => setPlate(e.target.value)} style={inputStyle} />
      <input placeholder="Car Type (e.g. Sedan)" value={type} onChange={(e) => setType(e.target.value)} style={inputStyle} />
      <button onClick={addVehicle}
        style={{ width: "100%", padding: "10px", marginTop: "10px",
          backgroundColor: "#f5a623", border: "none", borderRadius: "6px",
          color: "white", fontWeight: "bold", cursor: "pointer" }}>
        Add Vehicle
      </button>
      {msg && <p style={{ color: msg.includes("added") || msg.includes("removed") ? "green" : "red" }}>{msg}</p>}
      <h3>Your Vehicles</h3>
      {vehicles.length === 0 ? <p>No vehicles added yet.</p> : (
        vehicles.map((v) => (
          <div key={v.id} style={{ display: "flex", justifyContent: "space-between",
            padding: "10px", margin: "8px 0", border: "1px solid #eee", borderRadius: "6px" }}>
            <span>{v.licensePlate} — {v.type}</span>
            <button onClick={() => deleteVehicle(v.id)}
              style={{ backgroundColor: "red", color: "white", border: "none",
                borderRadius: "4px", cursor: "pointer", padding: "4px 8px" }}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}
