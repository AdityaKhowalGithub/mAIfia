import React, { useState, useEffect } from "react";
import "../Character.css";

const Character = ({ sprite }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === "Space") {
        setIsSpeaking(true);

        // Stop speaking after 5 seconds
        const stopSpeakingTimer = setTimeout(() => {
          setIsSpeaking(false);
        }, 5000);

        return () => clearTimeout(stopSpeakingTimer);
      }
    };

    // Add event listener for keypress
    window.addEventListener("keydown", handleKeyPress);

    // Clean up event listener
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  return (
    <div className={`character-container ${isSpeaking ? "speaking" : ""}`}>
      <img src={sprite} alt="Character Sprite" className="character-sprite" />
    </div>
  );
};

export default Character;
