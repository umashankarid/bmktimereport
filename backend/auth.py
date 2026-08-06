import os
import json
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import jwt
from sheets import reset_sheets_manager

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')

# Demo admin credentials (in production, use database)
ADMIN_CREDENTIALS = {
    'admin': 'password123'  # Username: admin, Password: password123
}

def generate_token(admin_data):
    """Generate JWT token"""
    payload = {
        'username': admin_data['username'],
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(f):
    """Decorator to verify JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid authorization header'}), 401

        if not token:
            return jsonify({'error': 'Missing token'}), 401

        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.admin = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated

def register_auth_routes(app, sheets_manager):
    """Register authentication routes"""

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        """Admin login endpoint"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No credentials provided'
                }), 400

            username = data.get('username')
            password = data.get('password')

            if not username or not password:
                return jsonify({
                    'success': False,
                    'message': 'Username and password required'
                }), 400

            # Verify credentials
            if username not in ADMIN_CREDENTIALS or ADMIN_CREDENTIALS[username] != password:
                return jsonify({
                    'success': False,
                    'message': 'Invalid username or password'
                }), 401

            # Generate token
            admin_data = {'username': username}
            token = generate_token(admin_data)

            return jsonify({
                'success': True,
                'token': token,
                'admin': admin_data
            }), 200

        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Login error: {str(e)}'
            }), 500

    @app.route('/api/auth/setup-sheets', methods=['POST'])
    @verify_token
    def setup_sheets():
        """Setup Google Sheets connection"""
        try:
            # Get sheet ID from form
            sheet_id = request.form.get('sheet_id')
            
            if not sheet_id:
                return jsonify({
                    'success': False,
                    'message': 'Google Sheet ID required'
                }), 400

            # Get credentials file
            if 'credentials' not in request.files:
                return jsonify({
                    'success': False,
                    'message': 'Credentials file required'
                }), 400

            credentials_file = request.files['credentials']

            if credentials_file.filename == '':
                return jsonify({
                    'success': False,
                    'message': 'No file selected'
                }), 400

            try:
                # Read and validate JSON
                credentials_data = json.load(credentials_file)
                
                # Validate it's a service account JSON
                if 'type' not in credentials_data or credentials_data['type'] != 'service_account':
                    return jsonify({
                        'success': False,
                        'message': 'Invalid service account JSON file'
                    }), 400

                # Save credentials to backend
                credentials_path = os.path.join(
                    os.path.dirname(__file__),
                    '..', 'credentials.json'
                )
                
                with open(credentials_path, 'w') as f:
                    json.dump(credentials_data, f)

                # Update environment
                os.environ['GOOGLE_SHEET_ID'] = sheet_id
                os.environ['GOOGLE_CREDENTIALS_PATH'] = credentials_path

                # Reinitialize sheets manager with new credentials
                reset_sheets_manager()

                return jsonify({
                    'success': True,
                    'message': 'Google Sheets connection configured successfully'
                }), 200

            except json.JSONDecodeError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid JSON file'
                }), 400
            except Exception as e:
                return jsonify({
                    'success': False,
                    'message': f'Setup error: {str(e)}'
                }), 500

        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Server error: {str(e)}'
            }), 500

    @app.route('/api/auth/setup-status', methods=['GET'])
    @verify_token
    def setup_status():
        """Check if Google Sheets is configured"""
        try:
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            credentials_path = os.getenv('GOOGLE_CREDENTIALS_PATH')

            configured = (
                sheet_id and 
                sheet_id != 'demo-sheet-id' and
                credentials_path and 
                os.path.exists(credentials_path) and
                credentials_path != 'credentials.json'
            )

            return jsonify({
                'success': True,
                'configured': configured,
                'sheet_id': sheet_id if configured else None
            }), 200

        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error checking setup: {str(e)}'
            }), 500

    @app.route('/api/auth/logout', methods=['POST'])
    @verify_token
    def logout():
        """Logout endpoint (optional - handled on client)"""
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200

    @app.route('/api/auth/trainer/register', methods=['POST'])
    def trainer_register():
        """Register a new trainer"""
        try:
            from trainer_auth import TrainerAuthManager
            
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            trainer_name = data.get('trainer_name')
            password = data.get('password')
            
            result = TrainerAuthManager.register_trainer(trainer_name, password)
            
            return jsonify(result), 200 if result['success'] else 400
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Registration error: {str(e)}'
            }), 500

    @app.route('/api/auth/trainer/login', methods=['POST'])
    def trainer_login():
        """Login trainer with name and password"""
        try:
            from trainer_auth import TrainerAuthManager
            import jwt
            
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            trainer_name = data.get('trainer_name')
            password = data.get('password')
            
            result = TrainerAuthManager.login_trainer(trainer_name, password)
            
            if result['success']:
                # Generate JWT token
                trainer_data = {
                    'name': trainer_name,
                    'type': 'trainer'
                }
                token = generate_token(trainer_data)
                
                return jsonify({
                    'success': True,
                    'token': token,
                    'trainer': result['trainer'],
                    'message': result['message']
                }), 200
            else:
                return jsonify(result), 401
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Login error: {str(e)}'
            }), 500
