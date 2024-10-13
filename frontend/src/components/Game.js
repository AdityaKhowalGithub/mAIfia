import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import Voting from './Voting';
import Notes from './Notes';
import TitlePage from "./TitlePage";
import "../App.css";

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
  const [playerSpeech, setPlayerSpeech] = useState('');
  const audioRef = useRef(null);
  


  useEffect(() => {
    socket.on('timer_update', (data) => {
      if (data.game_id === gameId) {
        setTimer(data.time);
      }
    });

    return () => {
      socket.off('timer_update');
    };
  }, [gameId]);

  useEffect(() => {
    socket.on('night_started', (data) => {
      if (data.game_id === gameId) {
        setStep('night');
      }
    });

    socket.on('day_started', (data) => {
      if (data.game_id === gameId) {
        setStep('day');
      }
    });

    socket.on('play_speech', (data)=>{
      if (data.game_id === gameId){
        playSpeech(data.text, data.voice_id);
      }
    });

    socket.on('play_audio', (data)=>{
      if (data.game_id === gameId){
        playAudio(data.audio_link);
      }
    });
  
    return () => {
      socket.off('play_audio');
      socket.off('night_started');
      socket.off('day_started');
    };
  }, [gameId]);

  const playSpeech = async (text, voice) => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/voice', { text, voice }, { responseType: 'blob' });
      console.log(response.data);
      const audioUrl = URL.createObjectURL(response.data);
      new Audio(audioUrl).play();
    } catch (error) {
      console.error('Error playing speech:', error);
    }
  };

  const playAudio = async (audioLink) => {
    const audio = new Audio(audioLink);
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
    });

  };

  useEffect(() => {
    const handleVoteCast = (data) => {
      if (data.game_id === gameId) {
        console.log(`Player ${data.voter_id} voted for ${data.target_id}`);
      }
    };

    const handlePlayerEliminated = (data) => {
      if (data.game_id === gameId) {
        const eliminatedPlayer = players.find(player => player.id === data.player_id);
        setPlayers((prev) =>
          prev.map((player) => player.id === data.player_id ? { ...player, alive: false } : player)
        );
      }
    };

    const handleGameOver = (data) => {
      if (data.game_id === gameId) {
        alert(`${data.winner} have won the game!`);
        socket.disconnect();
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
    const handlePlayerSpeech = (data) => {
      if (data.game_id === gameId) {
        console.log(`Player ${data.player_id} says: ${data.text}`);
        // You can update state to display this in the UI
      }
    };
  
    socket.on('player_speech', handlePlayerSpeech);
  
    return () => {
      socket.off('player_speech', handlePlayerSpeech);
    };
  }, [gameId]);

  useEffect(() => {
    socket.on('game_started', async (data) => {
      if (data.game_id === gameId) {
        setPlayers(data.players);
        console.log(data.players);
        
        await fetchRole();

        setStep('day');
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
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };
  const submitPlayerSpeech = async () => {
    try {
      await axios.post('http://127.0.0.1:5000/submit_speech', {
        game_id: gameId,
        player_id: playerId,
        text: playerSpeech,
      });
      setPlayerSpeech(''); // Clear the input after submission
    } catch (error) {
      console.error('Error submitting speech:', error);
    }
  };

  return (
<div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', color: '#333' }}>
  <h1 style={{ textAlign: 'center', color: '#d6d0c1', 'font-size': '60px', fontFamily: 'Courier New, monospace' }}>MaAIfia</h1>

  {step === 'menu' && (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '20px', width: '100%' }}>
        <input
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeAI}
            onChange={(e) => setIncludeAI(e.target.checked)}
          />

          <div style={{ color: '#d6d0c1' }}>Include AI Player</div>
        </label>
      </div>
      <button
        onClick={createGame}
        disabled={!playerName}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3498db',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}>
        Create Game
      </button>

      <hr style={{ width: '100%', margin: '20px 0' }} />

      <div style={{ width: '100%' }}>
        <input
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          type="text"
          placeholder="Enter Game ID"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        />
        <input
          style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ccc' }}
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button
          onClick={joinGame}
          disabled={!gameId || !playerName}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2ecc71',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}>
          Join Game
        </button>
      </div>
      <TitlePage />
    </div>
    </>
  )}

  {step === 'lobby' && (
    <>
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ color: '#2980b9' }}>Game Lobby</h2>
      <p>Game ID: <strong>{gameId}</strong></p>
      <p>Waiting for players to join...</p>
      <ul style={{ listStyleType: 'none', margin: '20px 0', padding: 0 }}>
        {players.map((player) => (
          <li key={player.id} style={{ marginBottom: '10px' }}>
            {player.name} {player.id === players[0].id && <span style={{ color: '#e74c3c' }}>(host)</span>}
          </li>
        ))}
      </ul>
      {players.length > 0 && players[0].id === playerId && (
        <button
          onClick={startGame}
          style={{
            padding: '10px 20px',
            backgroundColor: '#e67e22',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}>
          Start Game
        </button>
      )}
    </div>

    </>
  )}

  {step !== 'menu' && step !== 'lobby' && (
    <div style={{ textAlign: 'center' }}>
      <h2>{step.charAt(0).toUpperCase() + step.slice(1)}</h2>
      <h3>Your Role: <strong>{role}</strong></h3>
      <h3>Time Remaining: <strong>{timer}</strong> seconds</h3>

      {step === 'day' && (
        <>
          <Voting players={players} gameId={gameId} playerId={playerId} />
          <div style={{ marginTop: '20px' }}>
            <h3>Submit Your Speech</h3>
            <textarea
              value={playerSpeech}
              onChange={(e) => setPlayerSpeech(e.target.value)}
              rows={4}
              cols={50}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc',
                marginBottom: '10px',
              }}
            />
            <button
              onClick={submitPlayerSpeech}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}>
              Submit Speech
            </button>
          </div>
        </>
      )}

      {step === 'night' && role === 'mafia' && (
        <div style={{ marginTop: '20px' }}>
          <h3>Select a player to eliminate</h3>
          {players.filter((player) => player.alive).map((player) => (
            <button
              key={player.id}
              onClick={() => setTargetId(player.id)}
              style={{
                display: 'block',
                padding: '10px 20px',
                margin: '10px auto',
                backgroundColor: '#e74c3c',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}>
              {player.name}
            </button>
          ))}
          <button
            onClick={submitMafiaAction}
            style={{
              padding: '10px 20px',
              backgroundColor: '#c0392b',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px',
            }}>
            Submit Mafia Action
          </button>
        </div>
      )}

      <Notes />
    </div>
  )}
</div>
  );
}

export default Game;
