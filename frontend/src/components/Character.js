import React from "react";
import "../Character.css";

const Character = ({
  sprite,
  voice,
  speaking,
  isDead,
  role,
  isRealPlayer,
  isSelected,
  isRaisingHand,
  onClick,
}) => {
  return (
    <div
      className={`character-container 
        ${speaking ? "speaking" : ""} 
        ${isSelected ? "selected" : ""} 
        ${isDead ? "dead" : ""} 
        ${isRaisingHand ? "raising-hand" : ""}
        ${role} 
        ${isRealPlayer ? "real-player" : "ai-player"}`}
      onClick={onClick}
    >
      <img src={sprite} alt="Character Sprite" className="character-sprite" />
      <div className="character-role">{role}</div>
      {isRaisingHand && <div className="hand-icon">✋</div>}
    </div>
  );
};

export default Character;
