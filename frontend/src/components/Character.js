import React, { useState, useEffect } from "react";
import "../Character.css"; // We'll define the animation styles here

const Character = ({ sprite, voice, speaking }) => {
  const [isSpeaking, setIsSpeaking] = useState(speaking);

  useEffect(() => {
    if (speaking) {
      setIsSpeaking(true);
      // Stop speaking after 3 seconds (or any length of time the voice plays)
      const stopSpeakingTimer = setTimeout(() => {
        setIsSpeaking(false);
      }, 3000); // Adjust time as needed based on voice length

      return () => clearTimeout(stopSpeakingTimer);
    }
  }, [speaking]);

  return (
    <div className={`character-container ${isSpeaking ? "speaking" : ""}`}>
      <img src={sprite} alt="Character Sprite" className="character-sprite" />
    </div>
  );
};

export default Character;
