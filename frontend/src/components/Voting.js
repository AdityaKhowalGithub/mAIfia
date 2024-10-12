import React, { useState } from 'react';
import axios from 'axios';

function Voting({ players, gameId, playerId }) {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = async () => {
    try {
      await axios.post('http://127.0.0.1:5000/submit_vote', {
        game_id: gameId,
        player_id: playerId,
        target_id: selectedPlayer
      });
      setHasVoted(true);
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  return (
    <div>
      <h2>Voting</h2>
      {hasVoted ? (
        <p>You have voted.</p>
      ) : (
        <div>
          <select onChange={(e) => setSelectedPlayer(e.target.value)} value={selectedPlayer}>
            <option value="">Select a player</option>
            {players
              .filter((p) => p.alive && p.id !== playerId)
              .map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
          </select>
          <button onClick={handleVote} disabled={!selectedPlayer}>
            Vote
          </button>
        </div>
      )}
    </div>
  );
}

export default Voting;


