// App.jsx
import React from "react";
import FindParking from "./findParking";
import RegisterLot from "./registerLot";
import "./App.css"; // make sure this is imported

function App() {
  return (
    <div className="app-root">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">Smart Parking</h1>
          <p className="subtitle">Find nearby parking or register your lot.</p>
        </div>
      </header>

      <main className="main-grid">
        <section className="panel">
          <FindParking />
        </section>

        <section className="panel">
          <RegisterLot />
        </section>
      </main>
    </div>
  );
}

export default App;