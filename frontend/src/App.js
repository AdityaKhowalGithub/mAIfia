import React, { useState } from "react";
import Game from "./components/Game";
import "./App.css";
import Character from "./components/Character";

// Function to generate random roles
const generateRandomRoles = () => {
  const roles = [
    "mafia",
    "mafia", // 2 Mafia
    "doctor", // 1 Doctor
    "detective", // 1 Detective
    "normal", // 4 Normal
    "normal",
    "normal",
    "normal",
  ];

  // Shuffle the roles array
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  return roles;
};

function App() {
  const [isDead, setIsDead] = useState(false); // State to control "dead" status

  // Generate 8 characters with random roles
  const roles = generateRandomRoles();
  const characters = roles.map((role, index) => {
    const isRealPlayer = Math.random() < 0.5; // 50% chance of being a real player
    return {
      sprite: `/character${index + 1}.png`, // Assuming you have sprites named character1.png to character8.png
      voice: `voice${index + 1}.mp3`, // Assuming you have corresponding voice files
      role: role, // Assign the randomly generated role
      isRealPlayer: isRealPlayer, // Assign the real player status
    };
  });

  return (
    <div>
      {characters.map((character, index) => (
        <Character
          key={index}
          sprite={character.sprite}
          voice={character.voice}
          speaking={index === 0} // Example: Character 1 is speaking
          isDead={isDead} // Pass "isDead" prop to control grayscale state
          role={character.role} // Pass role prop
          isRealPlayer={character.isRealPlayer} // Pass real player status
        />
      ))}

      {/* Button to toggle the "dead" state */}
      <button onClick={() => setIsDead(!isDead)}>
        {isDead ? "Revive" : "Kill"} Character
      </button>
    </div>
  );
}

export default App;
