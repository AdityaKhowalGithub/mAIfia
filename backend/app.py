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

# Initialize AWS Bedrock client
bedrock_client = boto3.client('bedrock', region_name='us-east-1')  # Replace with your AWS region

# In-memory storage for players and games (for development purposes)
players = {}
games = {}

# Helper functions
def assign_roles(game):
    roles = ['Mafia', 'Detective', 'Doctor', 'Mayor']
    players_list = list(game['players'].values())
    random.shuffle(players_list)

    for i, player in enumerate(players_list):
        player['role'] = roles[i] if i < len(roles) else 'Civilian'

def start_night_phase(game_id):
    game = games[game_id]
    game['phase'] = 'night'
    
    # AI Mafia action if included
    ai_player = game['players'].get(game.get('ai_player_id'))
    if ai_player and ai_player['alive'] and ai_player['role'] == 'Mafia':
        ai_target_id = ai_mafia_action(game)
        game['mafia_target_id'] = ai_target_id
    
    socketio.emit('night_started', {'game_id': game_id}, room=game_id)

def start_day_phase(game_id):
    game = games[game_id]
    game['phase'] = 'day'
    
    # Process any night actions (like Mafia elimination)
    process_night_actions(game_id)
    socketio.emit('day_started', {'game_id': game_id}, room=game_id)

def check_win_conditions(game_id):
    game = games[game_id]
    players_list = game['players'].values()
    mafia_alive = any(p['role'] == 'Mafia' and p['alive'] for p in players_list)
    civilians_alive = any(p['role'] != 'Mafia' and p['alive'] for p in players_list)

    if not mafia_alive or not civilians_alive:
        winner = 'Civilians' if not mafia_alive else 'Mafia'
        game['status'] = 'ended'
        socketio.emit('game_over', {'game_id': game_id, 'winner': winner}, room=game_id)
    else:
        start_night_phase(game_id)

def eliminate_player(game_id):
    game = games[game_id]
    votes = game.get('votes', {})
    vote_counts = {}

    for target_id in votes.values():
        vote_counts[target_id] = vote_counts.get(target_id, 0) + 1

    if not vote_counts:
        return  # No votes cast

    max_votes = max(vote_counts.values())
    top_players = [player_id for player_id, count in vote_counts.items() if count == max_votes]
    eliminated_player_id = random.choice(top_players)
    game['players'][eliminated_player_id]['alive'] = False

    socketio.emit('player_eliminated', {'game_id': game_id, 'player_id': eliminated_player_id}, room=game_id)
    game['votes'] = {}
    check_win_conditions(game_id)

def ai_mafia_action(game):
    alive_players = [p for p in game['players'].values() if p['alive'] and not p.get('is_ai')]
    if not alive_players:
        return None

    # Prepare prompt for Bedrock
    prompt = "Select a player to eliminate: "
    prompt += ", ".join([p['name'] for p in alive_players])

    # Call Bedrock to get AI decision
    try:
        response = bedrock_client.invoke_model(
            modelId='your-model-id',  # Replace with your model ID
            contentType='text/plain',
            accept='application/json',
            body=prompt.encode('utf-8')
        )
        result = response['body'].read().decode('utf-8').strip()
        # Map result back to player ID
        target_player = next((p for p in alive_players if p['name'] == result), None)
        if target_player:
            return target_player['id']
    except Exception as e:
        print('Error invoking Bedrock model:', e)
        # Fallback to random selection
        return random.choice(alive_players)['id']

    return random.choice(alive_players)['id']

# API Routes
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
    if not game or game['status'] != 'waiting':
        return jsonify({'error': 'Game not found or already started/ended'}), 404

    player_id = str(uuid.uuid4())
    game['players'][player_id] = {'id': player_id, 'name': player_name, 'role': None, 'alive': True}

    socketio.emit('player_joined', {'game_id': game_id, 'players': list(game['players'].values())}, room=game_id)
    return jsonify({'player_id': player_id}), 200

# Create a new game
@app.route('/create_game', methods=['POST'])
def create_game():
    data = request.get_json()
    host_name = data.get('name')
    include_ai = data.get('include_ai', False)

    if not host_name:
        return jsonify({'error': 'Name is required'}), 400

    game_id = str(uuid.uuid4())
    player_id = str(uuid.uuid4())

    games[game_id] = {
        'game_id': game_id,
        'players': {player_id: {'id': player_id, 'name': host_name, 'role': None, 'alive': True}},
        'status': 'waiting',
        'include_ai': include_ai
    }

    return jsonify({'game_id': game_id, 'player_id': player_id}), 200

# Start the game
@app.route('/start_game', methods=['POST'])
def start_game():
    data = request.get_json()
    game_id = data.get('game_id')

    if not game_id:
        return jsonify({'error': 'Game ID is required'}), 400

    game = games.get(game_id)
    if not game or game['status'] != 'waiting':
        return jsonify({'error': 'Game not found or already started/ended'}), 404

    # Add AI player if included
    if game.get('include_ai'):
        ai_player_id = str(uuid.uuid4())
        game['players'][ai_player_id] = {
            'id': ai_player_id,
            'name': 'AI Player',
            'role': None,
            'alive': True,
            'is_ai': True
        }
        game['ai_player_id'] = ai_player_id

    assign_roles(game)
    game['status'] = 'in_progress'
    socketio.emit('game_started', {'game_id': game_id, 'players': list(game['players'].values())}, room=game_id)
    return jsonify({'status': 'Game started'}), 200

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

# Submit a vote
@app.route('/submit_vote', methods=['POST'])
def submit_vote():
    data = request.get_json()
    game_id = data.get('game_id')
    player_id = data.get('player_id')
    target_id = data.get('target_id')

    if not game_id or not player_id or not target_id:
        return jsonify({'error': 'Game ID, Player ID, and Target ID are required'}), 400

    game = games.get(game_id)
    if not game or game['status'] != 'in_progress':
        return jsonify({'error': 'Game not found or not in progress'}), 404

    game.setdefault('votes', {})
    game['votes'][player_id] = target_id

    return jsonify({'status': 'Vote submitted'}), 200

# WebSocket Events
@socketio.on('join')
def on_join(data):
    game_id = data.get('game_id')
    join_room(game_id)

@socketio.on('leave')
def on_leave(data):
    game_id = data.get('game_id')
    leave_room(game_id)

# Start the Flask server
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
