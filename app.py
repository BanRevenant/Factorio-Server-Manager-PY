from flask import Flask, render_template, request, session, jsonify, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_wtf.csrf import CSRFProtect
from functools import wraps
from datetime import datetime
import os
import json
import secrets
import gevent
from gevent import pywsgi
from gevent.pywsgi import WSGIServer
from gevent import monkey
monkey.patch_all()

from config import config

# Initialize Flask
app = Flask(__name__)
app.config.from_object(config[os.environ.get('FLASK_ENV', 'development')])

# Initialize extensions
csrf = CSRFProtect(app)
socketio = SocketIO(app, async_mode='gevent', cors_allowed_origins="*")

# Simulated database - Replace with actual database in production
USERS = {
    "admin": {
        "password": "admin",  # Replace with proper password hashing
        "role": "admin",
        "email": "admin@example.com"
    }
}

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"message": "Unauthorized"}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    if 'user' not in session:
        return False
    join_room(session['user']['username'])

@socketio.on('disconnect')
def handle_disconnect():
    if 'user' in session:
        leave_room(session['user']['username'])

@socketio.on('subscribe')
def handle_subscribe(data):
    room = data.get('room', '')
    join_room(room)

@socketio.on('unsubscribe')
def handle_unsubscribe(data):
    room = data.get('room', '')
    leave_room(room)

@socketio.on('command')
def handle_command(data):
    if 'user' not in session:
        return
    
    command = data.get('command', '')
    # TODO: Implement actual command handling
    emit('gamelog', f"Command executed: {command}", room=session['user']['username'])

@app.route('/ws')
def websocket():
    if 'wsgi.websocket' in request.environ:
        ws = request.environ['wsgi.websocket']
        while True:
            try:
                message = ws.receive()
                if message is None:
                    break
                ws.send(message)
            except:
                break
        return ''
    return '', 200  # Changed from 400 to 200

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username in USERS and USERS[username]['password'] == password:
            session['user'] = {
                'username': username,
                'role': USERS[username]['role']
            }
            return jsonify({
                "success": True,
                "username": username,
                "role": USERS[username]['role']
            })
        
        return jsonify({
            "success": False,
            "message": "Invalid credentials"
        }), 401
    
    return render_template('login.html')

@app.route('/api/user/status')
def user_status():
    if 'user' in session:
        return jsonify({
            "username": session['user']['username'],
            "role": session['user']['role']
        })
    return jsonify({"message": "Not authenticated"}), 401

@app.route('/logout')
def logout():
    session.clear()
    return jsonify({"success": True})

# Main routes
@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/saves')
@login_required
def saves():
    return render_template('saves.html')

@app.route('/mods')
@login_required
def mods():
    return render_template('mods.html')

@app.route('/console')
@login_required
def console():
    return render_template('console.html')

@app.route('/logs')
@login_required
def logs():
    return render_template('logs.html')

@app.route('/server-settings')
@login_required
def server_settings():
    return render_template('server-settings.html')

@app.route('/game-settings')
@login_required
def game_settings():
    return render_template('game-settings.html')

@app.route('/user-management')
@login_required
def user_management():
    return render_template('user-management.html')

@app.route('/help')
@login_required
def help():
    return render_template('help.html')

# Server control API endpoints
@app.route('/api/server/status')
@login_required
def server_status():
    # TODO: Implement actual server status check
    return jsonify({
        "running": False,
        "bindip": "0.0.0.0",
        "port": 34197,
        "savefile": "latest.zip",
        "fac_version": "1.1.87"
    })

@app.route('/api/server/facVersion')
@login_required
def factorio_version():
    # TODO: Implement actual version check
    return jsonify({
        "base_mod_version": "1.1.87"
    })

@app.route('/api/server/start', methods=['POST'])
@login_required
def start_server():
    data = request.json
    # TODO: Implement actual server start logic
    return jsonify({"success": True})

@app.route('/api/server/stop')
@login_required
def stop_server():
    # TODO: Implement actual server stop logic
    return jsonify({"success": True})

@app.route('/api/server/kill')
@login_required
def kill_server():
    # TODO: Implement actual server kill logic
    return jsonify({"success": True})

# Error handlers
@app.errorhandler(401)
def unauthorized(error):
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({"message": "Unauthorized"}), 401
    return redirect(url_for('login'))

@app.errorhandler(404)
def not_found(error):
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({"message": "Not found"}), 404
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({"message": "Internal server error"}), 500
    return render_template('500.html'), 500

# Security headers middleware
@app.after_request
def add_security_headers(response):
    for header, value in app.config['SECURITY_HEADERS'].items():
        response.headers[header] = value
    return response

if __name__ == '__main__':
    socketio.run(app, debug=app.config['DEBUG'])