// SOHA - UC-06: Manage Vehicles
import { useState } from "react";

const preloadedVehicles = [
  { id: 1, licensePlate: "ABC1234", make: "Toyota", model: "Corolla" },
  { id: 2, licensePlate: "XYZ5678", make: "Honda", model: "Civic" },
  { id: 3, licensePlate: "DEF9012", make: "Ford", model: "Mustang" },
];

const validatePlate = (plate) => /^[A-Z0-9]{1,8}$/.test(plate.toUpperCase());
const validateMake = (make) => /^[a-zA-Z\s]{2,}$/.test(make);
const validateModel = (model) => /^[a-zA-Z0-9\s]{2,}$/.test(model);

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");

  const addVehicle = () => {
    setMsg("");
    if (!plate && !make && !model) return setMsg("All fields are required.");
    if (!plate) return setMsg("Plate number is required.");
    if (!validatePlate(plate)) return setMsg("Invalid plate number. Only letters and numbers allowed (no special characters).");
    if (!make) return setMsg("Make is required.");
    if (!validateMake(make)) return setMsg("Invalid make. Only letters allowed.");
    if (!model) return setMsg("Model is required.");
    if (!validateModel(model)) return setMsg("Invalid model. Only letters and numbers allowed.");
    const exists = vehicles.find((v) => v.licensePlate.toUpperCase() === plate.toUpperCase());
    if (exists) return setMsg("A vehicle with this plate number already exists.");
    const newVehicle = { id: Date.now(), licensePlate: plate.toUpperCase(), make, model };
    setVehicles([...vehicles, newVehicle]);
    setMsgType("success");
    setMsg(`Vehicle ${plate.toUpperCase()} added successfully!`);
    setPlate("");
    setMake("");
    setModel("");
  };

  const deleteVehicle = (id) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
    setMsgType("success");
    setMsg("Vehicle removed successfully!");
  };

  const inputStyle = {
    width: "100%", padding: "10px", margin: "6px 0",
    borderRadius: "6px", border: "1px solid #444",
    background: "#1a1a1a", color: "white", fontSize: "14px"
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ color: "#f5a623" }}>Manage Vehicles</h2>
      <div style={{ background: "#1e1e1e", padding: "20px", borderRadius: "10px", marginBottom: "20px" }}>
        <h3 style={{ color: "white", marginTop: 0 }}>Add a Vehicle</h3>
        <input placeholder="Plate Number (e.g. ABC1234)" value={plate} onChange={(e) => { setPlate(e.target.value); setMsg(""); }} style={inputStyle} />
        <input placeholder="Make (e.g. Toyota)" value={make} onChange={(e) => { setMake(e.target.value); setMsg(""); }} style={inputStyle} />
        <input placeholder="Model (e.g. Corolla)" value={model} onChange={(e) => { setModel(e.target.value); setMsg(""); }} style={inputStyle} />
        <button onClick={addVehicle} style={{
          width: "100%", padding: "12px", marginTop: "10px",
          backgroundColor: "#f5a623", border: "none", borderRadius: "6px",
          color: "black", fontWeight: "bold", cursor: "pointer", fontSize: "15px"
        }}>
          Add Vehicle
        </button>
        {msg && <p style={{ color: msgType === "success" ? "#4caf50" : "#e53935", marginTop: "8px", fontSize: "14px" }}>{msg}</p>}
      </div>
      <h3 style={{ color: "white" }}>Your Vehicles</h3>
      {vehicles.length === 0 ? (
        <p style={{ color: "#888" }}>No vehicles added yet.</p>
      ) : (
        vehicles.map((v) => (
          <div key={v.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", margin: "8px 0",
            background: "#1e1e1e", border: "1px solid #333", borderRadius: "8px"
          }}>
            <div>
              <span style={{ color: "#f5a623", fontWeight: "bold" }}>{v.licensePlate}</span>
              <span style={{ color: "white", marginLeft: "10px" }}>{v.make} {v.model}</span>
            </div>
            <button onClick={() => deleteVehicle(v.id)} style={{
              backgroundColor: "#e53935", color: "white", border: "none",
              borderRadius: "4px", cursor: "pointer", padding: "6px 12px", fontSize: "13px"
            }}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}
