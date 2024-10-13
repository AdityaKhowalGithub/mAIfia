import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Character from './Character';
import Recorder from './Recorder'; // Ensure Recorder is imported
import '../CharacterBar.css';

const CharacterBar = ({ role, players, gameId, playerId }) => {
  const [playerCharacter, setPlayerCharacter] = useState(() => {
    const index = players.findIndex((player) => player.id === playerId);
    return index !== -1 ? index : 0;
  });
  const [votedCharacter, setVotedCharacter] = useState(null);
  const [speakingQueue, setSpeakingQueue] = useState([]);
  const [characters, setCharacters] = useState(() =>
    players.map((player, index) => ({
      id: player.id,
      sprite: `/character${index + 1}.png`,
      voice: `voice${index + 1}.mp3`,
      role: player.role,
      isRealPlayer: player.id === playerId,
      isDead: !player.alive,
      isSpeaking: false,
      isRaisingHand: false,
    }))
  );

  const handleCharacterClick = async (id) => {
    if (id === playerId || characters.find((char) => char.id === id).isDead) return;

    try {
      await axios.post('http://127.0.0.1:5000/submit_vote', {
        game_id: gameId,
        player_id: playerId,
        target_id: id,
      });
      setVotedCharacter(id);
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  const handleRaiseHand = () => {
    const playerChar = characters[playerCharacter];
    if (!playerChar.isRaisingHand && !speakingQueue.includes(playerChar.id)) {
      setSpeakingQueue([...speakingQueue, playerChar.id]);
    } else {
      setSpeakingQueue(speakingQueue.filter((id) => id !== playerChar.id));
    }
    setCharacters((chars) =>
      chars.map((char) =>
        char.id === playerChar.id
          ? { ...char, isRaisingHand: !char.isRaisingHand }
          : char
      )
    );
  };

  useEffect(() => {
    const speakingInterval = setInterval(() => {
      if (speakingQueue.length > 0) {
        const speakingCharacterId = speakingQueue[0];
        setCharacters((chars) =>
          chars.map((char) => ({
            ...char,
            isSpeaking: char.id === speakingCharacterId,
            isRaisingHand: char.id === speakingCharacterId ? false : char.isRaisingHand,
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

  const submitPlayerSpeech = () => {
    console.log('Player speech submitted');
    // Add your logic for speech submission here
  };

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
            isSelected={votedCharacter === character.id}
            isRaisingHand={character.isRaisingHand}
            onClick={() => handleCharacterClick(character.id)}
          />
        ))}
      </div>

      <div className="control-panel">
        {/* First Row: Player Indicator, Raise Hand, and Queue */}
        <div className="first-row" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
            <button onClick={handleRaiseHand}>Raise Hand</button>
          </div>

          <div className="queue-indicator">
            <span>Queue: </span>
            {speakingQueue.map((charId, index) => {
              const char = characters.find((c) => c.id === charId);
              return (
                <img
                  key={index}
                  src={char.sprite}
                  alt={`Character ${charId}`}
                  className="queue-icon"
                />
              );
            })}
          </div>
        </div>

        {/* Second Row: Submit Speech and Recorder */}
        <div className="second-row" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button
            onClick={submitPlayerSpeech}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Submit Speech
          </button>
          <Recorder gameId={gameId} playerId={playerId} />
        </div>
      </div>
    </div>
  );
};

export default CharacterBar;
