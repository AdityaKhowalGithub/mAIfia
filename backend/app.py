from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid, random, eventlet
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage for players (for development purposes)
players = {}
games = {}

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

@socketio.on('join_room')
def handle_join_room(data):
    game_id = data.get('game_id')
    player_id = data.get('player_id')
    
    # Add the player to the game room
    join_room(game_id)
    print(f"Player {player_id} joined game {game_id}")



if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=5000)
