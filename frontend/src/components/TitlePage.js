import React, { useEffect, useState } from "react";
import "../TitlePage.css"; // Make sure to create this CSS file

const roles = [
  {
    name: "civilian",
    color: "green",
    description: "Civilians do not have any special abilities.",
  },
  {
    name: "mafia",
    color: "red",
    description: "Mafia members work together to eliminate players.",
  },
  {
    name: "doctor",
    color: "lightblue",
    description: "Doctors can save players from being eliminated.",
  },
  {
    name: "detective",
    color: "gold",
    description: "Detectives can investigate players to find the mafia.",
  },
];

const TitlePage = ({ dayNumber, phase }) => {
  const [displayText, setDisplayText] = useState("");
  const [role, setRole] = useState({});
  const [typingIndex, setTypingIndex] = useState(0);
  const typingSpeed = 100; // Adjust typing speed here

  useEffect(() => {
    const textOptions = {
      DayPhase: `DAY ${dayNumber}`,
      NightPhase: `NIGHT ${dayNumber}`,
      RolePhase: `You are: `,
    };

    // Select random role if phase is RoleSelection
    if (phase === "RolePhase") {
      const randomRole = roles[Math.floor(Math.random() * roles.length)];
      setRole(randomRole);
      setDisplayText(textOptions[phase] + randomRole.name);
    } else {
      setDisplayText(textOptions[phase]);
    }

    // Start typing animation
    setTypingIndex(0); // Reset typing index
    const typingInterval = setInterval(() => {
      setTypingIndex((prev) => {
        if (prev < displayText.length) {
          return prev + 1;
        } else {
          clearInterval(typingInterval);
          return prev; // Keep it the same when done
        }
      });
    }, typingSpeed);

    return () => clearInterval(typingInterval);
  }, [dayNumber, phase, displayText]); // Include displayText to ensure typing starts with new text

  return (
    <div className={`title-page ${phase.toLowerCase().replace(" ", "-")}`}>
      <h1 className="typing-text" style={{ color: role.color }}>
        {displayText.slice(0, typingIndex)}
      </h1>
      {phase === "RolePhase" && (
        <p className="role-description">{role.description}</p>
      )}
    </div>
  );
};

export default TitlePage;
