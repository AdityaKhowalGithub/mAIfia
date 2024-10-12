import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import Voting from './Voting';
import Notes from './Notes';

// Initialize the socket connection
const socket = io('http://127.0.0.1:5000', {
  withCredentials: true,
  extraHeaders: {
    "my-custom-header": "abcd"
  }
});

function Game() {
  const [step, setStep] = useState('menu'); // 'menu', 'lobby', 'day', 'night', etc.
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [role, setRole] = useState('');
  const [players, setPlayers] = useState([]);
  const [targetId, setTargetId] = useState(''); // State for target player
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (step === 'day') setTimer(10);
    else if (step === 'night') setTimer(30);
  }, [step]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prevTimer) => prevTimer - 1), 1000);
    } else if (timer === 0) {
      handleTimerEnd();
    }
    return () => clearInterval(interval);
  }, [timer, step, players, gameId, playerId]);

  const handleTimerEnd = () => {
    if (step === 'day') {
      submitMajorityVote();
      setStep('night');
    } else if (step === 'night') {
      socket.emit('night_actions_complete', { game_id: gameId, player_id: playerId });
      setStep('day');
    }
  };

  const submitMajorityVote = () => {
    const majorityVote = {};
    players.forEach((player) => {
      if (player.alive) majorityVote[player.id] = player.votedTarget || null;
    });

    const targetVotes = Object.keys(majorityVote).reduce((acc, id) => {
      if (majorityVote[id]) {
        acc[majorityVote[id]] = (acc[majorityVote[id]] || 0) + 1;
      }
      return acc;
    }, {});

    const playersToEliminate = Object.keys(targetVotes).filter(
      (key) => targetVotes[key] === Math.max(...Object.values(targetVotes))
    );

    const eliminatedPlayer = playersToEliminate.length
      ? playersToEliminate[Math.floor(Math.random() * playersToEliminate.length)]
      : null;

    if (eliminatedPlayer) {
      socket.emit('submit_vote', {
        game_id: gameId,
        player_id: playerId,
        target_id: eliminatedPlayer,
      });
    }
  };

  useEffect(() => {
    socket.on('night_started', (data) => {
      if (data.game_id === gameId) {
        alert('Night phase has started.');
        setStep('night');
      }
    });
    return () => socket.off('night_started');
  }, [gameId]);

  useEffect(() => {
    const handleVoteCast = (data) => {
      if (data.game_id === gameId) {
        console.log(`Player ${data.voter_id} voted for ${data.target_id}`);
      }
    };

    const handlePlayerEliminated = (data) => {
      if (data.game_id === gameId) {
        alert(`Player ${data.player_id} has been eliminated.`);
        setPlayers((prevPlayers) => prevPlayers.map((player) => 
          player.id === data.player_id ? { ...player, alive: false } : player
        ));
      }
    };

    const handleGameOver = (data) => {
      if (data.game_id === gameId) {
        alert(`${data.winner} have won the game!`);
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
  }, [gameId]);

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
    if (data.game_id === gameId) {
      setPlayers(data.players);
    }
  };

  useEffect(() => {
    socket.on('game_started', async (data) => {
      if (data.game_id === gameId) {
        setPlayers(data.players);
        await fetchRole();
        setStep('day');
      }
    });
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
      socket.emit('mafia_action', { game_id: gameId, player_id: playerId, target_id: targetId });
    } catch (error) {
      console.error('Error submitting Mafia action:', error);
    }
  };

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

  const joinGame = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/join_game', { game_id: gameId, name: playerName });
      setPlayerId(response.data.player_id);
      setStep('lobby');
    } catch (error) {
      console.error('Error joining game:', error);
    }
  };

  const startGame = async () => {
    try {
      await axios.post('http://127.0.0.1:5000/start_game', { game_id: gameId });
      await fetchRole();
      setStep('day');
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
          { /* day or night */}
          <h2>{step.charAt(0).toUpperCase() + step.slice(1)}</h2>
          <h3>Your Role: {role}</h3>
          <h3>Time Remaining: {timer} seconds</h3>
          <h3>Players:</h3>
          <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
            {players.map((player) => (
              <li key={player.id}>
                {player.name} {player.alive ? '' : '(eliminated)'}
              </li>
            ))}
          </ul>
          {step === 'day' && role === 'mafia' && (
            <div>
              <h3>Select a target:</h3>
              <select onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Select player</option>
                {players.filter((player) => player.alive && player.id !== playerId).map((player) => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))}
              </select>
              <button onClick={submitMafiaAction} disabled={!targetId}>Submit Mafia Action</button>
            </div>
          )}
          {step === 'day' && (
            <Voting players={players} gameId={gameId} playerId={playerId} setTargetId={setTargetId} />
            /* <Voting players={players} playerId={playerId} setTargetId={setTargetId} /> */
          )}
          <Notes />
        </div>
      )}
    </div>
  );
}

export default Game;
