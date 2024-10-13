import React from "react";
import "./App.css";
import CharacterBar from "./components/CharacterBar";
import EventDisplay from "./components/EventDisplay";

function App() {
  return (
    <div className="App">
      <EventDisplay />
      <CharacterBar />
      {/* Add other components or content for your game here */}
    </div>
  );
}

export default App;
