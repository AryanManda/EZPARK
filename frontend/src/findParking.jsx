import { useState } from "react";
import axios from "axios";

function FindParking() {
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);

  const searchParking = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/parking?location=${location}`
      );
      setResults(res.data);
    } catch (err) {
      alert("Error fetching parking");
    }
  };

  return (
    <div>
      <h2>Find Parking</h2>
      <input
        placeholder="Enter location"
        onChange={(e) => setLocation(e.target.value)}
      />
      <button onClick={searchParking}>Search</button>

      <ul>
        {results.map((spot, index) => (
          <li key={index}>
            {spot.name} - ${spot.price} -{" "}
            {spot.available ? "Available" : "Full"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FindParking;