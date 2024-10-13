import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Character from './Character';
import Recorder from './Recorder'; // Ensure Recorder is imported
import '../CharacterBar.css';

import socket from './socket';


const CharacterBar = ({ role, players, gameId, playerId }) => {
  const [playerCharacter, setPlayerCharacter] = useState(() => {
    const index = players.findIndex((player) => player.id === playerId);
    return index !== -1 ? index : 0;
  });
  const [speakingQueue, setSpeakingQueue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [startRecording, setStartRecording] = useState(false);
  const [votedCharacter, setVotedCharacter] = useState(null);
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

  useEffect(() => {
    setCharacters(
      players.map((player, index) => ({
        id: player.id,
        sprite: `/character${index + 1}.png`,
        voice: `voice${index + 1}.mp3`,
        role: player.role,
        isRealPlayer: player.id === playerId,
        isDead: !player.alive,
        isSpeaking: currentSpeaker === player.id,
        isRaisingHand: speakingQueue.includes(player.id),
      }))
    );
  }, [players, currentSpeaker, speakingQueue]);
  
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
  const handleRecordingComplete = async () => {
    try {
      await axios.post('http://127.0.0.1:5000/done_speaking', {
        game_id: gameId,
        player_id: playerId,
      });
    } catch (error) {
      console.error('Error notifying done speaking:', error);
    }
  };
  


  const handleRaiseHand = async () => {
    try {
      await axios.post('http://127.0.0.1:5000/raise_hand', {
        game_id: gameId,
        player_id: playerId,
      });
    } catch (error) {
      console.error('Error raising hand:', error);
    }
  };
  


  useEffect(() => {
    const handleCurrentSpeaker = (data) => {
      if (data.game_id === gameId) {
        setCurrentSpeaker(data.player_id);
        if (data.player_id === playerId) {
          console.log('It is your turn to speak');

          // Start recording automatically if it's the player's turn
          setStartRecording(true);
        } else {
          // Stop recording if it's not the player's turn
          setStartRecording(false);
        }
      }
    };
  
    socket.on('current_speaker', handleCurrentSpeaker);
  
    return () => {
      socket.off('current_speaker', handleCurrentSpeaker);
    };
  }, [gameId, playerId]);
  

  useEffect(() => {
    // Existing event listeners

    // Add this useEffect to handle 'speaking_queue_updated'
    const handleSpeakingQueueUpdated = (data) => {
      if (data.game_id === gameId) {
        setSpeakingQueue(data.speaking_queue);
      }
    };

    socket.on('speaking_queue_updated', handleSpeakingQueueUpdated);

    return () => {
      socket.off('speaking_queue_updated', handleSpeakingQueueUpdated);
    };
  }, [gameId]);
  

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
              src={characters[playerCharacter]?.sprite}
              alt="Player Character"
              className="player-icon"
            />
            <span>{characters[playerCharacter]?.role}</span>
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
                  src={char?.sprite}
                  alt={`Character ${charId}`}
                  className="queue-icon"
                />
              );
            })}
          </div>
        </div>

        {/* Second Row: Recorder */}
        <div className="second-row" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
        <Recorder
  gameId={gameId}
  playerId={playerId}
  startRecording={startRecording}
  onRecordingComplete={handleRecordingComplete}
/>

        </div>
      </div>
    </div>
  );
};

export default CharacterBar;