//  Code by Russell Williams, NetID rdw230000

//  Enables state variables, see https://react.dev/reference/react/useState
import { useState } from "react";

class Entry {
  //  Construct new space from CheckIn Form
  constructor(loc, plate, make, model, space) {
    this.loc = loc;
    this.plate = plate;
    this.make = make;
    this.model = model;
    this.space = space;
    
    //  Automatically produces timestamp, see https://www.geeksforgeeks.org/javascript/how-to-get-current-time-in-javascript/
    let now = new Date();
    let currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'});
    this.time = currentTime;
  }
}

function CheckIn({ entries, setEntries }) {
    function handleSubmit(e) {
      
      // Prevent the browser from reloading the page
      e.preventDefault();
      const form = e.target;
      /*
      const formData = new FormData(form);
      const formJson = Object.fromEntries(formData.entries());
      console.log(formJson); 
      console.log([...formData.entries()]);
      */

      const newEntry = new Entry(
        form.locSelect.value,
        form.userPlate.value,
        form.userMake.value,
        form.userModel.value,
        form.userSpace.value
      );

      //  Check for blank entries
      if (newEntry.loc == "" || newEntry.plate == "" || newEntry.make == "" || newEntry.model == "" || newEntry.space == "" )
      {
          alert("One or more fields are blank. Please check all fields and try again.");
          return;
      }

      //  Cases that check against previous entries
      for (let i = 0; i < entries.length; i++)
      {
        if (entries[i].plate === newEntry.plate) 
        {
          alert("The vehicle associated with your license plate is already checked into this lot. You can check out using the checkout section below.");
          return; 
        }
        else if (entries[i].space === newEntry.space)
        {
          alert("This space is already taken. Please choose another.");
          return;
        }
      }



      setEntries(prev => [...prev, newEntry]);
      console.log(newEntry);
      alert("Checked in successfully");
    }

  return (
    <div class="form-box">
    <form method="post" onSubmit={handleSubmit}>
      <p>Check-in:</p>
      <label>
        Select from nearby parking lot locations:
        <select name="locSelect">
          <option value="Downtown Plaza">Downtown Plaza</option>
          <option value="Northside Garage">Northside Garage</option>
        </select>
      </label>
      <p>
      <label>
        License plate number: <input name="userPlate" defaultValue="" />
      </label>
      </p>
      <p>
      <label>
        Make: <input name="userMake" defaultValue="" />
      </label>
      </p>
      <p>
      <label>
        Model: <input name="userModel" defaultValue="" />
      </label>
      </p>
      <p>
      <label>
        Parking space: <input name="userSpace" defaultValue="" />
      </label>
      </p>
      <hr />
      <button type="reset">Reset</button>
      <button type="submit">Check In</button>
    </form>
    </div>
  );
}

function CheckOut({ entries, setEntries }) {
  function handleSubmit(e) {
    e.preventDefault();
    const plate = e.target.plate.value;

    const newEntries = entries.filter(entry => entry.plate !== plate);

    if (plate == "")
    {
      alert("Check out field is blank. Please specify a license plate number.");
      return;
    }
    if (newEntries.length === entries.length) 
    {
      alert("Vehicle with specified license plate is not checked in.");
      return;
    } 
    /*
    else 
    {
      console.log(`Checked out vehicle plate: ${plate}`);
    }*/

    setEntries(newEntries);
    alert("Checked out successfully");
  }

  
  return (
    <div class="form-box">
    <form onSubmit={handleSubmit}>
      <p>Check out by inputting your license plate below:</p>

      <input name="plate" />
      <button type="submit">Check Out</button>
    </form>
    </div>
  );
}

//  Export default is the keyword for what loads by default.
//  This loads both forms immediately.
//  A version where the website prompts back and forth
//  may be possible, but I cant figure it out atm
export default function EditPost() {
  const [entries, setEntries] = useState([]);

  return (
    <>
      <CheckIn entries={entries} setEntries={setEntries} />
      <CheckOut entries={entries} setEntries={setEntries} />

      {/* Visualization of checked in vehicles, updates when someone checks in/out, kind of unrealistic but necessary for testing */}
      <div className="entries-tabs">
        {entries.length === 0 ? (
          <p>No vehicles currently checked in.</p>
        ) : (
          entries.map((entry, index) => (
            <div key={index} className="tab">
              <h3>Space {entry.space}</h3>
              <p><strong>Plate:</strong> {entry.plate}</p>
              <p><strong>Make/Model:</strong> {entry.make} {entry.model}</p>
              <p><strong>Location:</strong> {entry.loc}</p>
              <p><strong>Time:</strong> {entry.time}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
}

