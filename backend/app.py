from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory storage for players (for development purposes)
players = {}

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    player_name = data.get('name')
    if not player_name:
        return jsonify({'error': 'Name is required'}), 400
    
    # Generate a unique player ID
    player_id = str(len(players) + 1)
    players[player_id] = {
        'id': player_id,
        'name': player_name,
        'role': None,  # Role assignment will be added later
        'alive': True
    }
    return jsonify({'player_id': player_id}), 200

if __name__ == '__main__':
    app.run(debug=True)
