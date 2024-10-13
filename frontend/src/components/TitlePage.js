import React, { useEffect, useState } from "react";
import "../TitlePage.css";

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
  {
    name: "jester",
    color: "purple",
    description: "Jesters aim to get themselves eliminated to win the game.",
  },
  {
    name: "godfather",
    color: "darkred",
    description: "The Godfather leads the mafia and cannot be investigated.",
  },
  {
    name: "cop",
    color: "blue",
    description: "Cops can investigate players each night to discover their roles.",
  },
  {
    name: "serial killer",
    color: "black",
    description: "The Serial Killer works alone and eliminates players at night.",
  },
  {
    name: "townsperson",
    color: "orange",
    description: "Townspersons have no special abilities but vote to eliminate players.",
  },
  {
    name: "bodyguard",
    color: "lightgreen",
    description: "Bodyguards can protect players from being eliminated at night.",
  },
  {
    name: "framer",
    color: "darkgreen",
    description: "Framers can frame innocent players to make them look guilty.",
  },
  {
    name: "witch",
    color: "violet",
    description: "Witches can control players to act in a way they desire during the night.",
  },
  {
    name: "vigilante",
    color: "teal",
    description: "Vigilantes can choose to eliminate a player, but if they target an innocent, they will lose.",
  },
  {
    name: "hunter",
    color: "brown",
    description: "Hunters can take someone down with them if they are eliminated.",
  },
  {
    name: "the fool",
    color: "gray",
    description: "The Fool tries to convince others they are innocent while secretly working against the town.",
  },
];

const TitlePage = ({ dayNumber, phase }) => {
  const [displayText, setDisplayText] = useState("");
  const [role, setRole] = useState({});
  const [typingIndex, setTypingIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const typingSpeed = 100; // Adjust typing speed here
  const pauseDuration = 4000; // Pause duration in milliseconds

  // Function to set a new role
  const updateRole = () => {
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    setRole(randomRole);
    setDisplayText(`Your role: ${randomRole.name}`);
    setTypingIndex(0); // Reset typing index to start typing the new role
    setIsDeleting(false); // Reset deleting state
    setIsPaused(false); // Reset pause state
  };

  // Effect for typing and deleting animation
  useEffect(() => {
    const typingInterval = setInterval(() => {
      setTypingIndex((prev) => {
        if (isPaused) {
          // If paused, do nothing
          return prev;
        }
        if (isDeleting) {
          // If deleting, decrement the index
          if (prev > 0) {
            return prev - 1;
          } else {
            // When done deleting, update the role
            updateRole();
            return 0; // Reset to 0 to ensure it doesn't go negative
          }
        } else {
          // If typing, increment the index
          if (prev < displayText.length) {
            return prev + 1;
          } else {
            // Start a pause before deleting
            setIsPaused(true); // Start pause
            setTimeout(() => {
              setIsDeleting(true); // Start deleting after pause
              setIsPaused(false); // Reset pause state
            }, pauseDuration);
            return prev; // Keep it the same when done
          }
        }
      });
    }, typingSpeed);

    return () => clearInterval(typingInterval); // Cleanup typing interval on component unmount
  }, [displayText, isDeleting, isPaused]); // Dependency on displayText, isDeleting, and isPaused

  // Initial role update on component mount
  useEffect(() => {
    updateRole(); // Initial role update
  }, []); // Empty dependency array so this runs only once on mount

  return (
    <div className={`title-page`}>
      <h1 className="typing-text" style={{ color: role?.color }}>
        {displayText ? displayText.slice(0, typingIndex) : ""}
      </h1>
      {phase === "RolePhase" && (
        <p className="role-description">{role?.description}</p>
      )}
    </div>
  );
};

export default TitlePage;
