import React, { useState, useEffect } from "react";
import "../Character.css"; // CSS file for animations

const Character = ({ sprite, voice, speaking, isDead, role, isRealPlayer }) => {
  const [isSpeaking, setIsSpeaking] = useState(speaking);
  const [isSelected, setIsSelected] = useState(false);

  // Handle speaking animation state
  useEffect(() => {
    if (speaking) {
      setIsSpeaking(true);
      const stopSpeakingTimer = setTimeout(() => {
        setIsSpeaking(false);
      }, 3000); // Adjust time based on voice length

      return () => clearTimeout(stopSpeakingTimer);
    } else {
      setIsSpeaking(false); // Ensure speaking is false when prop changes
    }
  }, [speaking]);

  // Handle character click for selection
  const handleClick = () => {
    if (isDead) {
      return; // Prevent selection if the player is dead
    }
    setIsSelected((prevSelected) => !prevSelected); // Toggle selected state for all players
  };

  return (
    <div
      className={`character-container ${isSpeaking ? "speaking" : ""} ${
        isSelected ? "selected" : ""
      } ${isDead ? "dead" : ""} ${role} ${
        isRealPlayer ? "real-player" : "ai-player"
      }`} // Add role class
      onClick={handleClick}
    >
      <img src={sprite} alt="Character Sprite" className="character-sprite" />
    </div>
  );
};

export default Character;
