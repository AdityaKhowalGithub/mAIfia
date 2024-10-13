import React, { useState, useEffect } from "react";
import Character from "./Character";
import "../CharacterBar.css";

const generateRandomRoles = () => {
  const roles = [
    "mafia",
    "mafia",
    "doctor",
    "detective",
    "normal",
    "normal",
    "normal",
    "normal",
  ];

  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  return roles;
};

const CharacterBar = () => {
  const [playerCharacter, setPlayerCharacter] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [votedCharacter, setVotedCharacter] = useState(null);
  const [speakingQueue, setSpeakingQueue] = useState([]);
  const [characters, setCharacters] = useState(() => {
    const roles = generateRandomRoles();
    return roles.map((role, index) => ({
      id: index,
      sprite: `/character${index + 1}.png`,
      voice: `voice${index + 1}.mp3`,
      role: role,
      isRealPlayer: index === 0,
      isDead: false,
      isSpeaking: false,
      isRaisingHand: false,
    }));
  });

  const handleCharacterClick = (id) => {
    setSelectedCharacter((prevSelected) => (prevSelected === id ? null : id));
  };

  const handleVote = () => {
    if (selectedCharacter !== null) {
      console.log(`Voted for character ${selectedCharacter}`);
      setVotedCharacter(selectedCharacter); // Update voted character state
    }
  };

  const handleRaiseHand = () => {
    const playerChar = characters[playerCharacter];
    if (!playerChar.isRaisingHand && !speakingQueue.includes(playerCharacter)) {
      setSpeakingQueue([...speakingQueue, playerCharacter]);
    } else if (playerChar.isRaisingHand) {
      setSpeakingQueue(speakingQueue.filter((id) => id !== playerCharacter));
    }
    setCharacters((chars) =>
      chars.map((char) =>
        char.id === playerCharacter
          ? { ...char, isRaisingHand: !char.isRaisingHand }
          : char
      )
    );
  };

  useEffect(() => {
    const speakingInterval = setInterval(() => {
      if (speakingQueue.length > 0) {
        const speakingCharacter = speakingQueue[0];
        setCharacters((chars) =>
          chars.map((char, index) => ({
            ...char,
            isSpeaking: index === speakingCharacter,
            isRaisingHand:
              index === speakingCharacter ? false : char.isRaisingHand,
          }))
        );
        setSpeakingQueue((prevQueue) => prevQueue.slice(1));
      } else {
        setCharacters((chars) =>
          chars.map((char) => ({ ...char, isSpeaking: false }))
        );
      }
    }, 5000);

    return () => clearInterval(speakingInterval);
  }, [speakingQueue]);

  return (
    <div className="character-bar-container">
      <div className="character-bar">
        {characters.map((character) => (
          <Character
            key={character.id}
            sprite={character.sprite}
            voice={character.voice}
            speaking={character.isSpeaking}
            isDead={character.isDead}
            role={character.role}
            isRealPlayer={character.isRealPlayer}
            isSelected={selectedCharacter === character.id}
            isRaisingHand={character.isRaisingHand}
            onClick={() => handleCharacterClick(character.id)}
          />
        ))}
      </div>
      <div className="control-panel">
        <div className="player-indicator">
          <span>Playing as: </span>
          <img
            src={characters[playerCharacter].sprite}
            alt="Player Character"
            className="player-icon"
          />
          <span>{characters[playerCharacter].role}</span>
        </div>
        <div className="button-container">
          <button onClick={handleVote} disabled={selectedCharacter === null}>
            Vote
          </button>
          <button onClick={handleRaiseHand}>Raise Hand</button>
        </div>
        <div className="queue-indicator">
          <span>Queue: </span>
          {speakingQueue.map((charId, index) => (
            <img
              key={index}
              src={characters[charId].sprite}
              alt={`Character ${charId + 1}`}
              className="queue-icon"
            />
          ))}
        </div>
        <div className="voted-indicator">
          <span>Voted for: </span>
          {votedCharacter !== null && (
            <img
              src={characters[votedCharacter].sprite}
              alt={`Voted Character ${votedCharacter + 1}`}
              className="voted-icon"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterBar;
