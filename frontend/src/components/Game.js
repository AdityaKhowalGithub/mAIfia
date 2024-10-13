import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import Voting from './Voting';
import Notes from './Notes';

const socket = io('http://127.0.0.1:5000', {
  withCredentials: true,
  extraHeaders: { "my-custom-header": "abcd" }
});

function Game() {
  const [step, setStep] = useState('menu');
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [role, setRole] = useState('');
  const [players, setPlayers] = useState([]);
  const [targetId, setTargetId] = useState('');
  const [timer, setTimer] = useState(0);
  const [includeAI, setIncludeAI] = useState(false);

  useEffect(() => {
    if (step === 'day') setTimer(30);
    if (step === 'night') setTimer(10);
  }, [step]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      handleTimerEnd();
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleTimerEnd = () => {
    if (step === 'day') setStep('night');
    if (step === 'night') setStep('day');
  };

  const playSpeech = async (text) => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/voice', { text }, { responseType: 'blob' });
      const audioUrl = URL.createObjectURL(response.data);
      new Audio(audioUrl).play();
    } catch (error) {
      console.error('Error playing speech:', error);
    }
  };

  useEffect(() => {
    socket.on('night_started', (data) => {
      if (data.game_id === gameId) {
        playSpeech('Night phase has started.');
        setStep('night');
      }
    });
    return () => socket.off('night_started');
  }, [gameId]);

  useEffect(() => {
    socket.on('day_started', (data) => {
      if (data.game_id === gameId) {
        playSpeech('Day phase has started.');
        setStep('day');
      }
    });
    return () => socket.off('day_started');
  }, [gameId]);

  useEffect(() => {
    const handleVoteCast = (data) => {
      if (data.game_id === gameId) {
        console.log(`Player ${data.voter_id} voted for ${data.target_id}`);
      }
    };

    const handlePlayerEliminated = (data) => {
      if (data.game_id === gameId) {
        const eliminatedPlayer = players.find(player => player.id === data.player_id);
        playSpeech(`Player ${eliminatedPlayer.name} has been eliminated.`);
        setPlayers((prev) =>
          prev.map((player) => player.id === data.player_id ? { ...player, alive: false } : player)
        );
      }
    };

    const handleGameOver = (data) => {
      if (data.game_id === gameId) {
        playSpeech(`${data.winner} have won the game!`);
        setStep('game_over');
      }
    };

    socket.on('vote_cast', handleVoteCast);
    socket.on('player_eliminated', handlePlayerEliminated);
    socket.on('game_over', handleGameOver);

    return () => {
      socket.off('vote_cast', handleVoteCast);
      socket.off('player_eliminated', handlePlayerEliminated);
      socket.off('game_over', handleGameOver);
    };
  }, [gameId, players]);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/get_players', { params: { game_id: gameId } });
      setPlayers(response.data.players);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  useEffect(() => {
    if (gameId && playerId) {
      socket.emit('join_room', { game_id: gameId, player_id: playerId });
      fetchPlayers();
      socket.on('player_joined', handlePlayerJoined);
    }
  }, [gameId, playerId]);

  const handlePlayerJoined = (data) => {
    if (data.game_id === gameId) setPlayers(data.players);
  };

  useEffect(() => {
    socket.on('game_started', async (data) => {
      if (data.game_id === gameId) {
        setPlayers(data.players);
        console.log(data.players);
        
        await fetchRole();

        setStep('day');
        playSpeech('The game has started. It is now daytime.');
      }
    });
    return () => socket.off('game_started');
  }, [gameId, playerId]);

  const fetchRole = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/get_role', { params: { game_id: gameId, player_id: playerId } });
      setRole(response.data.role);
    } catch (error) {
      console.error('Error fetching role:', error);
    }
  };

  const submitMafiaAction = async () => {
    try {
      socket.emit('mafia_action', { game_id: gameId, player_id: playerId, target_id: 'fix this later' });
    } catch (error) {
      console.error('Error submitting Mafia action:', error);
    }
  };

  const createGame = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/create_game', { name: playerName, include_ai: includeAI });
      setGameId(response.data.game_id);
      setPlayerId(response.data.player_id);
      setStep('lobby');
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const joinGame = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/join_game', { game_id: gameId, name: playerName });
      console.log("the response player id is" , response.data.player_id); 
      setPlayerId(response.data.player_id);
      setStep('lobby');
    } catch (error) {
      console.error('Error joining game:', error);
    }
  };

  const startGame = async () => {
    try {
      await axios.post('http://127.0.0.1:5000/start_game', { game_id: gameId });
      setStep('day');
      playSpeech('The game has started. It is now daytime.');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const submitVote = (targetId) => {
    socket.emit('submit_vote', {
      game_id: gameId,
      player_id: playerId,
      target_id: targetId,
    });
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
          <label>
            <input
              type="checkbox"
              checked={includeAI}
              onChange={(e) => setIncludeAI(e.target.checked)}
            />
            Include AI Player
          </label>
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
          <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
            {players.map((player) => (
              <li key={player.id}>{player.name} {player.id === players[0].id && '(host)'}</li>
            ))}
          </ul>
          {players.length > 0 && players[0].id === playerId && (
            <button onClick={startGame}>Start Game</button>
          )}
        </div>
      )}
      {step !== 'menu' && step !== 'lobby' && (
        <div>
          <h2>{step.charAt(0).toUpperCase() + step.slice(1)}</h2>
          <h3>Your Role: {role}</h3>
          <h3>Time Remaining: {timer} seconds</h3>
          {step === 'day' && (
            <Voting
              players = {players}
              gameId = {gameId}
              playerId = {playerId}
            />
          )}
          {step === 'night' && role === 'mafia' && (
            <div>
              <h3>Select a player to eliminate</h3>
              {players.filter((player) => player.alive).map((player) => (
                <button
                  key={player.id}
                  onClick={() => setTargetId(player.id)}
                >
                  {player.name}
                </button>
              ))}
              <button onClick={submitMafiaAction}>Submit Mafia Action</button>
            </div>
          )}
          <Notes />
        </div>
      )}
    </div>
  );
}

export default Game;
