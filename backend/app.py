from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import uuid
import random
import io
from flask_socketio import SocketIO, emit, join_room, leave_room
import boto3

app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize AWS Polly client
polly_client = boto3.client('polly', region_name='us-east-1')  # Replace with your AWS region

# In-memory storage for players (for development purposes)
players = {}
games = {}

# Get players for a specific game
@app.route('/get_players', methods=['GET'])
def get_players():
    game_id = request.args.get('game_id')
    if not game_id:
        return jsonify({'error': 'Game ID is required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    return jsonify({'players': list(game['players'].values())}), 200

# Join an existing game
@app.route('/join_game', methods=['POST'])
def join_game():
    data = request.get_json()
    game_id = data.get('game_id')
    player_name = data.get('name')

    if not game_id or not player_name:
        return jsonify({'error': 'Game ID and Name are required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    if game['status'] != 'waiting':
        return jsonify({'error': 'Game has already started or ended'}), 400

    # Generate a unique player ID
    player_id = str(uuid.uuid4())

    # Add the player to the game
    game['players'][player_id] = {
        'id': player_id,
        'name': player_name,
        'role': None,
        'alive': True
    }

    # Emit an event to notify all players in this game that a new player has joined
    socketio.emit('player_joined', {'game_id': game_id, 'players': list(game['players'].values())}, room=game_id)

    return jsonify({'player_id': player_id}), 200

# Create a new game
@app.route('/create_game', methods=['POST'])
def create_game():
    data = request.get_json()
    host_name = data.get('name')
    if not host_name:
        return jsonify({'error': 'Name is required'}), 400

    # Generate a unique game ID
    game_id = str(uuid.uuid4())
    # Generate a unique player ID for the host
    player_id = str(uuid.uuid4())

    # Initialize the game data
    games[game_id] = {
        'game_id': game_id,
        'players': {
            player_id: {
                'id': player_id,
                'name': host_name,
                'role': None,
                'alive': True
            }
        },
        'status': 'waiting'  # Game status can be 'waiting', 'in_progress', or 'ended'
    }

    return jsonify({'game_id': game_id, 'player_id': player_id}), 200

# Assign roles to players
def assign_roles(game):
    roles = ['Mafia', 'Detective', 'Doctor', 'Mayor']
    players = list(game['players'].values())
    random.shuffle(players)
    num_players = len(players)

    # Assign roles to players
    for i, player in enumerate(players):
        if i < len(roles):
            player['role'] = roles[i]
        else:
            player['role'] = 'Civilian'

# Start the game
@app.route('/start_game', methods=['POST'])
def start_game():
    data = request.get_json()
    game_id = data.get('game_id')

    if not game_id:
        return jsonify({'error': 'Game ID is required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    if game['status'] != 'waiting':
        return jsonify({'error': 'Game has already started or ended'}), 400

    # Assign roles to players
    assign_roles(game)

    # Update game status
    game['status'] = 'in_progress'

    # Emit an event to notify all players that the game has started
    socketio.emit('game_started', {'game_id': game_id, 'players': list(game['players'].values())}, room=game_id)

    return jsonify({'status': 'Game started'}), 200

# Start the night phase
def start_night_phase(game_id):
    game = games[game_id]
    game['phase'] = 'night'

    # Emit an event to notify players
    socketio.emit('night_started', {'game_id': game_id}, room=game_id)

# Get the role of a player
@app.route('/get_role', methods=['GET'])
def get_role():
    game_id = request.args.get('game_id')
    player_id = request.args.get('player_id')

    if not game_id or not player_id:
        return jsonify({'error': 'Game ID and Player ID are required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    player = game['players'].get(player_id)
    if not player:
        return jsonify({'error': 'Player not found in this game'}), 404

    return jsonify({'role': player['role']}), 200

# Handle player joining a room
@socketio.on('join_room')
def handle_join_room(data):
    game_id = data.get('game_id')
    player_id = data.get('player_id')

    # Add the player to the game room
    join_room(game_id)
    print(f"Player {player_id} joined game {game_id}")

# Submit a vote during the day phase
@app.route('/submit_vote', methods=['POST'])
def submit_vote():
    data = request.get_json()
    game_id = data.get('game_id')
    player_id = data.get('player_id')
    target_id = data.get('target_id')

    if not game_id or not player_id or not target_id:
        print("Invalid data", data)
        return jsonify({'error': 'Game ID, Player ID, and Target ID are required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    if game['status'] != 'in_progress':
        print("Game not in progress")
        return jsonify({'error': 'Game is not in progress'}), 400

    # Initialize votes dictionary if it doesn't exist
    if 'votes' not in game:
        game['votes'] = {}

    # Record the player's vote
    game['votes'][player_id] = target_id

    # Emit a 'vote_cast' event to update clients
    socketio.emit('vote_cast', {
        'game_id': game_id,
        'voter_id': player_id,
        'target_id': target_id
    }, room=game_id)

    # Check if all alive players have voted
    alive_players = [p_id for p_id, p in game['players'].items() if p['alive']]
    if len(game['votes']) == len(alive_players):
        # Tally votes and proceed to elimination
        eliminate_player(game_id)

    return jsonify({'status': 'Vote submitted'}), 200

# Eliminate a player based on votes
def eliminate_player(game_id):
    game = games[game_id]
    votes = game.get('votes', {})
    vote_counts = {}

    # Count the votes for each target
    for target_id in votes.values():
        if target_id in vote_counts:
            vote_counts[target_id] += 1
        else:
            vote_counts[target_id] = 1

    if not vote_counts:
        return  # No votes cast

    # Find the player(s) with the highest votes
    max_votes = max(vote_counts.values())
    top_players = [player_id for player_id, count in vote_counts.items() if count == max_votes]

    # In case of a tie, randomly choose one
    eliminated_player_id = random.choice(top_players)
    game['players'][eliminated_player_id]['alive'] = False

    # Emit an event to notify all players
    socketio.emit('player_eliminated', {
        'game_id': game_id,
        'player_id': eliminated_player_id
    }, room=game_id)

    # Clear the votes for the next round
    game['votes'] = {}

    # Check for win conditions
    check_win_conditions(game_id)

    if game['status'] != 'ended':
        start_night_phase(game_id)

# Handle Mafia's action during the night phase
@socketio.on('mafia_action')
def handle_mafia_action(data):
    game_id = data.get('game_id')
    player_id = data.get('player_id')
    target_id = data.get('target_id')

    game = games.get(game_id)
    if not game:
        emit('error', {'error': 'Game not found'}, room=request.sid)
        return

    player = game['players'].get(player_id)
    if player['role'] != 'Mafia':
        emit('error', {'error': 'You are not Mafia'}, room=request.sid)
        return

    # Store the Mafia's action in the game state
    game['mafia_target_id'] = target_id

    # Proceed to day phase
    start_day_phase(game_id)

# Process night actions and start day phase
def process_night_actions(game_id):
    game = games[game_id]
    # Process Mafia's action
    mafia_target_id = game.get('mafia_target_id')
    if mafia_target_id and game['players'][mafia_target_id]['alive']:
        # Eliminate the targeted player
        game['players'][mafia_target_id]['alive'] = False

        # Notify players about the elimination
        socketio.emit('player_eliminated', {
            'game_id': game_id,
            'player_id': mafia_target_id
        }, room=game_id)

    # Clear night actions
    game['mafia_target_id'] = None

# Start the day phase
def start_day_phase(game_id):
    game = games[game_id]
    game['phase'] = 'day'

    # Process night actions
    process_night_actions(game_id)

    # Emit an event to notify players
    socketio.emit('day_started', {'game_id': game_id}, room=game_id)

# Check win conditions after each elimination
def check_win_conditions(game_id):
    game = games[game_id]
    players = game['players'].values()
    mafia_alive = any(p['role'] == 'Mafia' and p['alive'] for p in players)
    civilians_alive = any(p['role'] != 'Mafia' and p['alive'] for p in players)

    if not mafia_alive:
        game['status'] = 'ended'
        socketio.emit('game_over', {
            'game_id': game_id,
            'winner': 'Civilians'
        }, room=game_id)
    elif not civilians_alive:
        game['status'] = 'ended'
        socketio.emit('game_over', {
            'game_id': game_id,
            'winner': 'Mafia'
        }, room=game_id)
    else:
        # Proceed to the next phase (e.g., night)
        socketio.emit('start_night', {'game_id': game_id}, room=game_id)

# Voice synthesis route using AWS Polly
@app.route('/voice', methods=['POST'])
def voice():
    data = request.get_json()
    text = data.get('text')
    voice_id = data.get('voice_id', 'Joanna')  # Default voice

    if not text:
        return jsonify({'error': 'Text is required'}), 400

    try:
        # Call Amazon Polly to synthesize speech
        response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=voice_id
        )
    except Exception as e:
        print('Error synthesizing speech:', e)
        return jsonify({'error': str(e)}), 500

    # Check if the response contains 'AudioStream'
    if 'AudioStream' in response:
        audio_stream = response['AudioStream'].read()
        if audio_stream:
            return send_file(
                io.BytesIO(audio_stream),
                mimetype='audio/mpeg',
                as_attachment=False,
                download_name='speech.mp3'
            )
        else:
            return jsonify({'error': 'AudioStream is empty'}), 500
    else:
        return jsonify({'error': 'Could not retrieve AudioStream from response'}), 500

# Endpoint to receive voice recordings from players
@app.route('/upload_voice', methods=['POST'])
def upload_voice():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Save or process the file as needed
    # For simplicity, we'll just acknowledge receipt
    return jsonify({'status': 'Voice received'}), 200

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
