from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid, random, eventlet
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# In-memory storage for players (for development purposes)
players = {}
games = {}

# get players app route for game id
@app.route('/get_players', methods=['GET'])
def get_players():
    game_id = request.args.get('game_id')
    if not game_id:
        return jsonify({'error': 'Game ID is required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    return jsonify({'players': list(game['players'].values())}), 200

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


def start_night_phase(game_id):
    game = games[game_id]
    game['phase'] = 'night'

    # Emit an event to notify players
    socketio.emit('night_started', {'game_id': game_id}, room=game_id)

    

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



@app.route('/submit_vote', methods=['POST'])
def submit_vote():
    data = request.get_json()
    game_id = data.get('game_id')
    player_id = data.get('player_id')
    target_id = data.get('target_id')

    if not game_id or not player_id or not target_id:
        print("bullshit", data)
        return jsonify({'error': 'Game ID, Player ID, and Target ID are required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    if game['status'] != 'in_progress':
        print("penis")
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

@socketio.on('mafia_action')
def handle_mafia_action(data):
    game_id = data.get('game_id')
    player_id = data.get('player_id')
    target_id = data.get('target_id')

    # Validate and process action
    # Store the action in the game state
def start_day_phase(game_id):
    game = games[game_id]
    game['phase'] = 'day'

    # Process night actions
    process_night_actions(game_id)

    # Emit an event to notify players
    socketio.emit('day_started', {'game_id': game_id}, room=game_id)


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


if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=5000, debug=True)
