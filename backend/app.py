from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid, random, io, boto3, time, json, re
from threading import Thread, Lock
from queue import Queue
from botocore.exceptions import ClientError


app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
winner = None

# Initialize AWS Polly client
polly_client = boto3.client('polly', region_name='us-east-1')

# Initialize AWS Bedrock client
bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-2')

# In-memory storage for players and games (for development purposes)
players = {}
games = {}

speech_queue = Queue()
speech_lock = Lock()
def process_speech_queue():
    """Process speeches sequentially from the queue."""
    while True:
        game_id, text = speech_queue.get()  # Blocks until an item is available
        if text:
            # Emit play speech event to the client
            socketio.emit('play_speech', {'game_id': game_id, 'text': text}, room=game_id)

            # Ensure the next speech starts only after the current one finishes
            time.sleep(5)

        speech_queue.task_done()

# Start the speech processing thread
Thread(target=process_speech_queue, daemon=True).start()

def queue_speech(game_id, text):
    """Add a speech to the queue safely."""
    with speech_lock:
        speech_queue.put((game_id, text))



# Modify these functions to manage the phase based on the backend timer.
def timer_thread(game_id, duration):
    game = games[game_id]
    while duration > 0 and game['status'] == 'in_progress':
        socketio.emit('timer_update', {'game_id': game_id, 'time': duration}, room=game_id)
        time.sleep(1)
        duration -= 1

    # Handle phase transitions when the timer reaches 0
    if game['phase'] == 'day':
        check_win_conditions(game_id)
        start_night_phase(game_id)
    else:
        check_win_conditions(game_id)
        start_day_phase(game_id)

def start_timer(game_id, duration):
    thread = Thread(target=timer_thread, args=(game_id, duration))
    thread.start()

def start_night_phase(game_id):
    game = games[game_id]
    game['phase'] = 'night'
    socketio.emit('night_started', {'game_id': game_id}, room=game_id)
    socketio.emit('play_speech', {'game_id': game_id, 'text': "Night Phase has Started"}, room=game_id)
    start_timer(game_id, 10)  # Start a 10-second timer for the night phase

def start_day_phase(game_id):
    game = games[game_id]
    game['phase'] = 'day'
    socketio.emit('day_started', {'game_id': game_id}, room=game_id)
    socketio.emit('play_speech', {'game_id': game_id, 'text': "Day Phase has Started"}, room=game_id)


      # AI Player submits a vote
    if game['include_ai']:
        ai_player = next((p for p in game['players'].values() if p['name'] == 'AI player'), None)
        if ai_player and ai_player['alive']:
            target_player = next((p for p in game['players'].values() if p['alive'] and p['id'] != ai_player['id']), None)
            ai_speech = generate_ai_speech(game_id)
            queue_speech(game_id, ai_speech)

            if target_player:
                game.setdefault('votes', {})
                game['votes'][ai_player['id']] = target_player['id']
                socketio.emit('vote_cast', {'game_id': game_id, 'voter_id': ai_player['id'], 
                                            'target_id': target_player['id']}, room=game_id)

    start_timer(game_id, 30)  # Start a 30-second timer for the day phase
def generate_ai_speech(game_id):
    def create_context(role, temperament):
        context_prompt = (
                        f'''
            You are a character in a Mafia game. You must speak as if you are playing a role in a real conversation, trying to deceive or convince others. Your intention is to win the game. You can be one of the following roles:

            Mafia: Your goal is to eliminate the other players without getting caught. Blend in with innocent players, lie convincingly, and subtly direct suspicion onto others.

            Detective: You are secretly investigating other players, but you must be careful not to reveal your role too soon. Speak with logic and caution, while gathering enough evidence to expose the Mafia.

            Doctor: Your role is to save other players from being eliminated. You want to protect others and avoid suspicion yourself. Be persuasive and trusted by the group without revealing your identity.

            Innocent Villager: You don’t have special powers, but you must help the group by observing and participating in discussions to identify the Mafia. Use reasoning, but be mindful that you are vulnerable to being falsely accused.

            Your role is {role}. Your demeanor is {temperament}. Your anme is AI Player.
            
            Given your role, generate a 1-2 sentence statement that fits within the flow of the conversation, considering these factors:

            Respond to a direct accusation or suspicion that has been raised against you or another player.
            If you are Mafia, create doubt in the group by subtly pointing fingers or deflecting blame. If you are innocent or hold a special role, defend yourself and try to identify who might be the Mafia.
            Your tone can range from calm and collected to anxious or frustrated, depending on the pressure you’re under. You may never use emotes or stage directions.
            The response should sound natural, as though you were engaging in a real conversation during the game. Your response must be one sentence. Two is a strict maximum and should be used sparingly. Make sure to use the names of the other players.

            The following is some game context:
            {game['players']}
            The following is the current conversation:
            '''
        )
        return context_prompt

    game = games[game_id]
    ai_player = next((p for p in game['players'].values() if p['is_ai']), None)

    # Construct context with player speeches and roles
    context = create_context(ai_player['role'], 'cunning')
    for player in game['players'].values():
        context += f"{player['name']}: {game['speeches'].get(player['id'], '')}\n"
    print(context)
    try:
        # Make a call to Bedrock using the `converse` method
        response = bedrock_client.converse(
            modelId="us.anthropic.claude-3-haiku-20240307-v1:0",
            messages=[
                {
                    "role": "user",
                    "content": [{'text' : context}]
                }
            ],
            inferenceConfig={"maxTokens": 1000, "temperature": 1},
            additionalModelRequestFields={"top_k": 250}
        )

        # Extract response text
        response_text = response['output']['message']['content'][0]['text']
        response_text = re.sub(r"\*{1,2}(.*?)\*{1,2}", "", response_text)
        
        print(f"AI Player response: {response_text}")
        return response_text

    except (ClientError, Exception) as e:
        print(f"ERROR: Can't converse with model. Reason: {e}")
        return "Sorry, an error occurred."

# Helper functions
def assign_roles(game):
    roles = ['Mafia', 'Detective', 'Doctor', 'Mayor']
    players_list = list(game['players'].values())
    random.shuffle(players_list)

    for i, player in enumerate(players_list):
        player['role'] = roles[i] if i < len(roles) else 'Civilian'

def check_win_conditions(game_id):
    global winner
    if winner: 
        return # Game already ended
    game = games[game_id]
    players_list = game['players'].values()
    mafia_alive = any(p['role'] == 'Mafia' and p['alive'] for p in players_list)
    civilians_alive = any(p['role'] != 'Mafia' and p['alive'] for p in players_list)

    if not mafia_alive or not civilians_alive:
        winner = 'Civilians' if not mafia_alive else 'Mafia'
        game['status'] = 'ended'
        socketio.emit('play_speech', {'game_id': game_id, 'text': f"The game has ended. The {winner} have won!"}, room=game_id)
        socketio.emit('game_over', {'game_id': game_id, 'winner': winner}, room=game_id)

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
    
    global winner
    if not winner:
        socketio.emit('play_speech', {'game_id': game_id, 'text': f"Player {game['players'][eliminated_player_id]['name']} has been eliminated"}, room=game_id)
    

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
        'players': {player_id: {'id': player_id, 'name': host_name, 'role': None, 'alive': True, 'is_ai': False}},
        'status': 'waiting',
        'include_ai': include_ai,
        'speaking_queue': [],  # Add this line
        'current_speaker': None,  # Keep track of who is currently speakin
        'speeches': {}
    }

    if include_ai:
        ai_player_id = str(uuid.uuid4())
        games[game_id]['players'][ai_player_id] = {'id': ai_player_id, 'name': 'AI player', 'role': None, 'alive': True, 'is_ai': True}

    return jsonify({'game_id': game_id, 'player_id': player_id}), 200


@app.route('/raise_hand', methods=['POST'])
def raise_hand():
    data = request.get_json()
    game_id = data.get('game_id')
    player_id = data.get('player_id')

    if not game_id or not player_id:
        return jsonify({'error': 'Game ID and Player ID are required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    # Check if player is already in the queue
    if player_id not in game['speaking_queue']:
        game['speaking_queue'].append(player_id)

    return jsonify({'status': 'Hand raised'}), 200

@app.route('/done_speaking', methods=['POST'])
def done_speaking():
    data = request.get_json()
    game_id = data.get('game_id')

    if not game_id:
        return jsonify({'error': 'Game ID is required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    # Move to the next speaker
    if game['speaking_queue']:
        next_speaker_id = game['speaking_queue'].pop(0)
        game['current_speaker'] = next_speaker_id

        # Notify clients about the new current speaker
        socketio.emit('current_speaker', {'game_id': game_id, 'player_id': next_speaker_id}, room=game_id)

        # If the next speaker is the AI, generate its speech
        if game['players'][next_speaker_id]['is_ai']:
            ai_speech = generate_ai_speech(game_id)
            # Process AI speech as needed (e.g., add to context, emit events)
            queue_speech(game_id, ai_speech)
            # Automatically mark AI as done speaking
            socketio.emit('ai_done_speaking', {'game_id': game_id, 'player_id': next_speaker_id}, room=game_id)
            # Move to the next speaker
            done_speaking()
    else:
        game['current_speaker'] = None  # No one is speaking

    return jsonify({'status': 'Done speaking'}), 200

@app.route('/start_game', methods=['POST'])
def start_game():
    data = request.get_json()
    game_id = data.get('game_id')

    if not game_id:
        return jsonify({'error': 'Game ID is required'}), 400

    game = games.get(game_id)
    if not game or game['status'] != 'waiting':
        return jsonify({'error': 'Game not found or already started/ended'}), 404

    assign_roles(game)
    game['status'] = 'in_progress'
    socketio.emit('game_started', {'game_id': game_id, 'players': list(game['players'].values())}, room=game_id)
    print('starting day phase')
    start_day_phase(game_id)
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

@app.route('/submit_speech', methods=['POST'])
def submit_speech():
    data = request.get_json()
    game_id = data.get('game_id')
    player_id = data.get('player_id')
    text = data.get('text')

    if not game_id or not player_id or not text:
        return jsonify({'error': 'Game ID, Player ID, and Text are required'}), 400

    game = games.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    # Store the speech in the game data
    game.setdefault('speeches', {})
    game['speeches'][player_id] = text

    # Broadcast the speech to other players
    socketio.emit('player_speech', {'game_id': game_id, 'player_id': player_id, 'text': text}, room=game_id)

    return jsonify({'status': 'Speech submitted'}), 200

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
    socketio.emit('vote_cast', {'game_id': game_id, 'voter_id': player_id, 'target_id': target_id}, room=game_id)

    alive_players = [p_id for p_id, p in game['players'].items() if p['alive']]
    if len(game['votes']) == len(alive_players):
        eliminate_player(game_id)

    return jsonify({'status': 'Vote submitted'}), 200

@socketio.on('join_room')
def handle_join_room(data):
    game_id = data.get('game_id')
    player_id = data.get('player_id')
    join_room(game_id)
    print(f"Player {player_id} joined game {game_id}")


# Voice synthesis route using AWS Polly
@app.route('/voice', methods=['POST'])
def voice():
    data = request.get_json()
    text = data.get('text')
    voice_id = data.get('voice_id', 'Ruth')  # Default voice

    if not text:
        return jsonify({'error': 'Text is required'}), 400

    try:
        # Call Amazon Polly to synthesize speech
        # response = polly_client.synthesize_speech(
        #     Text=text,
        #     OutputFormat='mp3',
        #     VoiceId=voice_id
        # )
        response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId='Matthew',
            Engine='generative'  # Specify the neural engine
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
