import React from "react";
import "./App.css";
import CharacterBar from "./components/CharacterBar";
import EventDisplay from "./components/EventDisplay";
import PhaseTracker from "./components/PhaseTracker";

function App() {
  return (
    <div className="App">
      <PhaseTracker />
      <EventDisplay />
      <CharacterBar />
      {/* Add other components or content for your game here */}
    </div>
  );
}

export default App;
