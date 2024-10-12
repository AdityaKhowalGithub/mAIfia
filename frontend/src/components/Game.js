import React, { useState, useEffect } from 'react';
import Voting from './Voting';
import Notes from './Notes';

function Game() {
  const [role, setRole] = useState(''); // Player's role
  const [players, setPlayers] = useState([]); // List of players

  // Mock data to simulate backend responses
  useEffect(() => {
    // Simulate fetching the player's role
    setTimeout(() => {
      setRole('Detective'); // Replace with dynamic role later
    }, 500);

    // Simulate fetching the list of players
    setTimeout(() => {
      setPlayers([
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' },
        { id: '4', name: 'Diana' },
      ]);
    }, 500);
  }, []);

  const handleVote = (targetId) => {
    // Simulate voting action
    alert(`You voted for player with ID: ${targetId}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Mafia Game</h1>
      <p>Your role: <strong>{role || 'Loading...'}</strong></p>
      <Voting players={players} onVote={handleVote} />
      <Notes />
      {/* Voice Recorder can be added later */}
    </div>
  );
}

export default Game;

