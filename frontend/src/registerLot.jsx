import { useState } from "react";
import axios from "axios";

function RegisterLot() {
  const [form, setForm] = useState({
    name: "",
    location: "",
    price: ""
  });

  const handleSubmit = async () => {
    try {
      await axios.post("http://localhost:5000/api/register", form);
      alert("Registered!");
    } catch (err) {
      alert("Error registering lot");
    }
  };

  return (
    <div>
      <h2>Register Parking Lot</h2>
      <input
        placeholder="Name"
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        placeholder="Location"
        onChange={(e) => setForm({ ...form, location: e.target.value })}
      />
      <input
        placeholder="Price"
        type="number"
        onChange={(e) => setForm({ ...form, price: e.target.value })}
      />
      <button onClick={handleSubmit}>Register</button>
    </div>
  );
}

export default RegisterLot;