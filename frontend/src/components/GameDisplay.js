import React, { useState } from "react";
import CharacterBar from "./CharacterBar";
import EventDisplay from "./EventDisplay"; // Import your EventDisplay component
import PhaseTracker from "./PhaseTracker"; // Import your PhaseTracker component
import Notes from "./Notes"; // Import your PhaseTracker component
import Timer from "./Timer"; // Import your PhaseTracker component

import "../GameDisplay.css";

const GameDisplay = () => {
  return (
    <div className="game-container">
      <PhaseTracker />
      <div className="middle">
        <EventDisplay />
        <div>
          <Timer />
          <Notes />
        </div>
      </div>

      <CharacterBar />
    </div>
  );
};

export default GameDisplay;
