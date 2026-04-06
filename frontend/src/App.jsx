import './style.css';
import React, { useState } from 'react';

const carTypes = ['Sedan', 'SUV', 'Compact'];

function App() {
  const [view, setView] = useState('owner'); // 'owner' or 'driver'
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-6">
      <h1 className="text-2xl font-semibold mb-4">Parking Finder</h1>
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            view === 'owner' ? 'bg-blue-500 text-white' : 'bg-white'
          }`}
          onClick={() => setView('owner')}
        >
          Owner: Register Lot
        </button>
        <button
          className={`px-4 py-2 rounded ${
            view === 'driver' ? 'bg-blue-500 text-white' : 'bg-white'
          }`}
          onClick={() => setView('driver')}
        >
          Driver: Find Parking
        </button>
      </div>
      {view === 'owner' ? <OwnerForm /> : <DriverSearch />}
    </div>
  );
}

// Owner form component
function OwnerForm() {
  const [form, setForm] = useState({
    name: '',
    address: '',
    carType: carTypes[0],
    rate: '',
    spots: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('http://localhost:4000/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          rate: Number(form.rate),
          spots: Number(form.spots),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.errors ? data.errors.join(', ') : 'Error registering lot');
      } else {
        setMessage('Parking lot registered');
      }
    } catch (err) {
      setMessage('Server error');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white shadow-md rounded p-6 w-full max-w-md space-y-4"
    >
      <h2 className="text-xl font-medium">Register Parking Lot</h2>
      <input
        name="name"
        placeholder="Lot Name"
        value={form.name}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
      />
      <input
        name="address"
        placeholder="Address"
        value={form.address}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
      />
      <select
        name="carType"
        value={form.carType}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
      >
        {carTypes.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <input
        name="rate"
        type="number"
        placeholder="Hourly Rate ($)"
        value={form.rate}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
      />
      <input
        name="spots"
        type="number"
        placeholder="Total Spots"
        value={form.spots}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
      />
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Save Lot
      </button>
      {message && <p className="text-sm text-red-600 mt-2">{message}</p>}
    </form>
  );
}

// Driver search component
function DriverSearch() {
  const [location, setLocation] = useState('');
  const [carType, setCarType] = useState(carTypes[0]);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');

  const search = async (e) => {
    e.preventDefault();
    setMessage('');
    setResults([]);
    try {
      const params = new URLSearchParams({ location, carType });
      const res = await fetch(`http://localhost:4000/lots/search?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Error searching');
      } else if (data.results.length === 0) {
        setMessage(data.message || 'No parking lots found');
      } else {
        setResults(data.results);
      }
    } catch (err) {
      setMessage('Server error');
    }
  };

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={search}
        className="bg-white shadow-md rounded p-6 space-y-4"
      >
        <h2 className="text-xl font-medium">Find Parking</h2>
        <input
          placeholder="Location (e.g. Downtown)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <select
          value={carType}
          onChange={(e) => setCarType(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          {carTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Search
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

      {results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map((lot) => (
            <li
              key={lot.id}
              className="bg-white rounded shadow p-3 flex justify-between"
            >
              <div>
                <p className="font-medium">{lot.name}</p>
                <p className="text-xs text-gray-500">{lot.address}</p>
              </div>
              <div className="text-right text-sm">
                <p>{lot.carType}</p>
                <p>${lot.rate}/hr</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;