import React, { useState } from "react";
import CharacterBar from "./CharacterBar";
import EventDisplay from "./EventDisplay"; // Import your EventDisplay component
import PhaseTracker from "./PhaseTracker"; // Import your PhaseTracker component
import Notes from "./Notes"; // Import your Notes component
import Timer from "./Timer"; // Import your Timer component
import TitlePage from "./TitlePage"; // Import TitlePage component

import "../GameDisplay.css";

const GameDisplay = () => {
  const [currentPhase, setCurrentPhase] = useState("gameplay"); // Set the initial phase to "gameplay"
  const dayNumber = 1; // Example day number; you might want to manage this dynamically

  const changePhase = (newPhase) => {
    setCurrentPhase(newPhase);
  };

  return (
    <div className="game-container">
      {/* Conditionally render TitlePage for non-gameplay phases */}
      {currentPhase !== "gameplay" ? (
        <TitlePage dayNumber={dayNumber} phase={currentPhase} />
      ) : (
        <>
          <PhaseTracker />

          {/* Conditionally render EventDisplay, Timer, Notes, and CharacterBar based on currentPhase */}
          <div className="game-container">
            <div className="middle">
              <EventDisplay />
              <div>
                <Timer />
                <Notes />
              </div>
            </div>

            <CharacterBar />
          </div>

          {/* Example buttons to change the phase */}
          <div className="phase-controls">
            <button onClick={() => changePhase("gameplay")}>
              Gameplay Phase
            </button>
            <button onClick={() => changePhase("RolePhase")}>Role Phase</button>
            <button onClick={() => changePhase("DayPhase")}>Day Phase</button>
            <button onClick={() => changePhase("NightPhase")}>
              Night Phase
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GameDisplay;
