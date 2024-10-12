import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import Voting from './Voting';
import Notes from './Notes';

// Initialize the socket connection
const socket = io('http://127.0.0.1:5000');


function Game() {
  const [step, setStep] = useState('menu'); // 'menu', 'lobby', 'game'
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [role, setRole] = useState('');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (gameId && playerId) {
      // Emit join_room event when the player joins the game
      socket.emit('join_room', { game_id: gameId, player_id: playerId });

      // Fetch the list of players in the game
      axios.get('http://127.0.0.1:5000/get_players', { params: { game_id: gameId } })
        .then(response => {
          setPlayers(response.data.players);
        })
        .catch(error => {
          console.error('Error fetching players:', error);
        });
      
      // Listen for the player_joined event
      socket.on('player_joined', (data) => {
        // alert the update on browser
        if (data.game_id === gameId) {
          setPlayers(data.players);
        }
      });
      
    }
  }, [gameId, playerId]);

  useEffect(() => {
    // Listen for the game_started event
    socket.on('game_started', (data) => {
      if (data.game_id === gameId) {
        setPlayers(data.players);
  
        // Fetch the player's role
        axios.get('http://127.0.0.1:5000/get_role', { params: { game_id: gameId, player_id: playerId } })
          .then(response => {
            setRole(response.data.role);
            setStep('game');  // Move to the game view
          })
          .catch(error => {
            console.error('Error fetching role:', error);
          });
      }
    });
  }, [gameId, playerId]);
  

  // Function to create a new game
  const createGame = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/create_game', { name: playerName });
      setGameId(response.data.game_id);
      setPlayerId(response.data.player_id);
      setStep('lobby');
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  // Function to join an existing game
  const joinGame = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/join_game', { game_id: gameId, name: playerName });
      setPlayerId(response.data.player_id);
      setStep('lobby');
    } catch (error) {
      console.error('Error joining game:', error);
    }
  }

  // Function to start the game
  const startGame = async () => {
    try {
      await axios.post('http://127.0.0.1:5000/start_game', { game_id: gameId });
      // Fetch the player's role
      const response = await axios.get('http://127.0.0.1:5000/get_role', { params: { game_id: gameId, player_id: playerId } });
      setRole(response.data.role);
      setStep('game');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Mafia Game</h1>
      {step === 'menu' && (
        <div>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={createGame} disabled={!playerName}>Create Game</button>
          <hr />
          <input
            type="text"
            placeholder="Enter Game ID"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={joinGame} disabled={!gameId || !playerName}>Join Game</button>
        </div>
      )}
      {step === 'lobby' && (
        <div>
          <h2>Game Lobby</h2>
          <p>Game ID: {gameId}</p>
          <p>Waiting for players to join...</p>

          {/* Display the list of players in the lobby without bullets and indents */}
          <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
            {players.map((player) => (
              // If it is the host (first in the list), append (host) to the name
              <li key={player.id}>{player.name} {player.id === players[0].id && '(host)'}</li>
            ))}
          </ul>

          { /* Join Game button only works for first user in player array */}
          {players.length > 0 && players[0].id === playerId && (
            <button onClick={startGame}>Start Game</button>
          )}
        </div>
      )}
      {step === 'game' && (
        <div>
          <p>Your role: <strong>{role}</strong></p>
          <Voting players={players} onVote={() => {}} />
          <Notes />
        </div>
      )}
    </div>
  );
}

export default Game;
