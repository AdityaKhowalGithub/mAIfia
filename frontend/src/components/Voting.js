import React from 'react';

function Voting({ players, onVote }) {
  return (
    <div>
      <h2>Voting</h2>
      {players.length === 0 ? (
        <p>Loading players...</p>
      ) : (
        players.map((player) => (
          <div key={player.id} style={{ marginBottom: '10px' }}>
            <button onClick={() => onVote(player.id)}>
              Vote for {player.name}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default Voting;

