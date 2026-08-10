import os
import json
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import jwt
from sheets import reset_sheets_manager
import logging

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')

# Demo admin credentials - default users (in production, use database)
# These are fallback credentials. If user changes password, it gets stored in the Login sheet
ADMIN_CREDENTIALS = {
    'admin': {'password': 'password123', 'type': 'Admin'},
    'andi': {'password': 'komet123', 'type': 'Admin'},
    'sugi': {'password': 'komet123', 'type': 'Admin'}
}

def generate_token(admin_data):
    """Generate JWT token"""
    # Support both 'username' (admin) and 'name' (trainer)
    username = admin_data.get('username') or admin_data.get('name') or 'unknown'
    payload = {
        'username': username,
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
        """Admin and trainer login endpoint"""
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

            # First try admin login from Login sheet
            try:
                from trainer_auth import TrainerAuthManager
            except ImportError:
                from backend.trainer_auth import TrainerAuthManager
            
            login_sheet = TrainerAuthManager.get_login_sheet()
            all_users = login_sheet.get_all_records()
            
            # Look for user in Login sheet
            user_found_in_sheet = False
            for user in all_users:
                user_name = user.get('Trainer Name', '').strip()
                if user_name.lower() == username.lower():
                    user_found_in_sheet = True
                    user_type = user.get('Trainer Type', 'Assistant Trainer')
                    stored_hash = user.get('Password Hash', '')
                    salt = user.get('Salt', '')
                    
                    # Verify password if hash exists
                    if stored_hash and salt:
                        if TrainerAuthManager.verify_password(stored_hash, password, salt):
                            # Generate token
                            user_data = {
                                'username': user_name,
                                'type': user_type,
                                'email': user.get('Email', '')
                            }
                            token = generate_token(user_data)
                            
                            logger.warning(f"✅ Successful login for {user_type}: {user_name}")
                            
                            return jsonify({
                                'success': True,
                                'token': token,
                                'admin': user_data
                            }), 200
                        else:
                            logger.warning(f"❌ Invalid password for user: {user_name}")
                            return jsonify({
                                'success': False,
                                'message': 'Invalid username or password'
                            }), 401
                    else:
                        # User in sheet but no password hash yet - check fallback credentials
                        logger.warning(f"⚠️  No password hash for user: {user_name}, checking fallback credentials")
                        break
            
            # If not found in sheet or no hash in sheet, try hardcoded admin credentials (fallback)
            if username in ADMIN_CREDENTIALS:
                cred = ADMIN_CREDENTIALS[username]
                if cred['password'] == password:
                    admin_data = {'username': username, 'type': cred['type']}
                    token = generate_token(admin_data)
                    logger.warning(f"✅ Fallback login for {cred['type']}: {username}")
                    
                    return jsonify({
                        'success': True,
                        'token': token,
                        'admin': admin_data
                    }), 200
                else:
                    logger.warning(f"❌ Invalid password for fallback user: {username}")
            
            logger.warning(f"❌ Login failed for username: {username}")
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401

        except Exception as e:
            logger.error(f"❌ Login error: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Login error: {str(e)}'
            }), 500

    @app.route('/api/auth/change-password', methods=['POST'])
    @verify_token
    def change_password():
        """Change password for admin or trainer"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            username = request.admin.get('username')
            old_password = data.get('old_password', '').strip()
            new_password = data.get('new_password', '').strip()
            
            if not old_password or not new_password:
                return jsonify({
                    'success': False,
                    'message': 'Old and new passwords required'
                }), 400
            
            if len(new_password) < 6:
                return jsonify({
                    'success': False,
                    'message': 'New password must be at least 6 characters'
                }), 400
            
            # Get trainer auth manager
            try:
                from trainer_auth import TrainerAuthManager
            except ImportError:
                from backend.trainer_auth import TrainerAuthManager
            
            login_sheet = TrainerAuthManager.get_login_sheet()
            all_users = login_sheet.get_all_records()
            
            # Find user and verify old password
            user_row = None
            for idx, user in enumerate(all_users, start=2):
                if user.get('Trainer Name', '').strip().lower() == username.lower():
                    stored_hash = user.get('Password Hash', '')
                    salt = user.get('Salt', '')
                    
                    # Verify old password
                    if stored_hash and salt:
                        if TrainerAuthManager.verify_password(stored_hash, old_password, salt):
                            user_row = idx
                            break
                        else:
                            return jsonify({
                                'success': False,
                                'message': 'Current password is incorrect'
                            }), 401
                    else:
                        # User exists in sheet but no password hash yet
                        # This shouldn't happen, but treat as error
                        return jsonify({
                            'success': False,
                            'message': 'User password not configured'
                        }), 400
            
            # If user not found in sheet, check fallback credentials
            if not user_row:
                if username in ADMIN_CREDENTIALS:
                    cred = ADMIN_CREDENTIALS[username]
                    if cred['password'] == old_password:
                        # User is using fallback credentials
                        # Need to add them to the sheet first
                        from datetime import datetime
                        
                        created_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        new_row = [
                            username,      # Trainer Name
                            '',            # Email
                            '',            # Phone
                            cred['type'],  # Trainer Type (Admin)
                            '',            # Photo
                            '',            # Password Hash (will be set below)
                            '',            # Salt (will be set below)
                            created_date   # Created Date
                        ]
                        
                        login_sheet.append_row(new_row)
                        # Get the new row number (should be len + 2 for header + 1)
                        user_row = len(all_users) + 2
                        logger.warning(f"✅ Created sheet entry for user: {username}")
                    else:
                        return jsonify({
                            'success': False,
                            'message': 'Current password is incorrect'
                        }), 401
                else:
                    return jsonify({
                        'success': False,
                        'message': 'User not found'
                    }), 404
            
            # Hash new password
            new_hash, new_salt = TrainerAuthManager.hash_password(new_password)
            
            # Update password hash and salt in sheet
            login_sheet.update_cell(user_row, login_sheet.find('Password Hash').col, new_hash)
            login_sheet.update_cell(user_row, login_sheet.find('Salt').col, new_salt)
            
            logger.warning(f"✅ Password changed for user: {username}")
            
            return jsonify({
                'success': True,
                'message': 'Password changed successfully'
            }), 200
            
        except Exception as e:
            logger.error(f"❌ Error changing password: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Error changing password: {str(e)}'
            }), 500

    @app.route('/api/auth/init-admin-users', methods=['POST'])
    @verify_token
    def init_admin_users():
        """Initialize default admin users (andi and sugi) - admin only"""
        try:
            username = request.admin.get('username', '')
            user_type = request.admin.get('type', '')
            
            # Only allow existing admins to create new admins
            if user_type != 'admin':
                return jsonify({
                    'success': False,
                    'message': 'Only admins can initialize admin users'
                }), 403
            
            try:
                from trainer_auth import TrainerAuthManager
            except ImportError:
                from backend.trainer_auth import TrainerAuthManager
            
            from datetime import datetime
            
            login_sheet = TrainerAuthManager.get_login_sheet()
            all_users = login_sheet.get_all_records()
            
            # Admin users to create
            admin_users = [
                {'name': 'andi', 'password': 'komet123'},
                {'name': 'sugi', 'password': 'komet123'}
            ]
            
            created_count = 0
            updated_count = 0
            
            for admin in admin_users:
                trainer_name = admin['name']
                password = admin['password']
                
                # Hash password
                pwd_hash, salt = TrainerAuthManager.hash_password(password)
                
                # Check if user already exists
                user_exists = False
                user_row = None
                for idx, user in enumerate(all_users, start=2):
                    if user.get('Trainer Name', '').strip().lower() == trainer_name.lower():
                        user_exists = True
                        user_row = idx
                        break
                
                if user_exists and user_row:
                    # Update existing user
                    login_sheet.update_cell(user_row, login_sheet.find('Password Hash').col, pwd_hash)
                    login_sheet.update_cell(user_row, login_sheet.find('Salt').col, salt)
                    updated_count += 1
                    logger.warning(f"✅ Updated admin user: {trainer_name}")
                else:
                    # Create new admin user row
                    created_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    new_row = [
                        trainer_name,      # Trainer Name
                        '',                # Email
                        '',                # Phone
                        'Admin',           # Trainer Type
                        '',                # Photo
                        pwd_hash,          # Password Hash
                        salt,              # Salt
                        created_date       # Created Date
                    ]
                    
                    login_sheet.append_row(new_row)
                    created_count += 1
                    logger.warning(f"✅ Created admin user: {trainer_name}")
            
            return jsonify({
                'success': True,
                'message': f'Admin users initialized: {created_count} created, {updated_count} updated',
                'created': created_count,
                'updated': updated_count,
                'admins': ['andi', 'sugi'],
                'password': 'komet123'
            }), 200
        
        except Exception as e:
            logger.error(f"❌ Error initializing admin users: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Error initializing admin users: {str(e)}'
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
        """Register a new trainer with email, phone, trainer type, and optional photo (stored as base64)"""
        try:
            from trainer_auth import TrainerAuthManager
            import base64
            
            # Get form data
            trainer_name = request.form.get('trainer_name')
            password = request.form.get('password')
            email = request.form.get('email')
            phone = request.form.get('phone')
            trainer_type = request.form.get('trainer_type', 'Assistant Trainer')  # Default to Assistant
            photo_file = request.files.get('photo')
            
            # Validation
            if not trainer_name or not password:
                return jsonify({
                    'success': False,
                    'message': 'Trainer name and password are required'
                }), 400
            
            if not email or not phone:
                return jsonify({
                    'success': False,
                    'message': 'Email and phone are required'
                }), 400
            
            # Handle photo upload if provided - convert to base64
            photo_base64 = None
            if photo_file:
                try:
                    # Read file and encode as base64
                    photo_data = photo_file.read()
                    photo_base64 = base64.b64encode(photo_data).decode('utf-8')
                except Exception as e:
                    return jsonify({
                        'success': False,
                        'message': f'Failed to process photo: {str(e)}'
                    }), 400
            
            # Register trainer with base64 photo and trainer type
            result = TrainerAuthManager.register_trainer(trainer_name, password, email, phone, photo_base64, trainer_type)
            
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
            
            logger.warning(f"\n{'='*60}")
            logger.warning(f"📍 TRAINER LOGIN ENDPOINT CALLED")
            logger.warning(f"{'='*60}")
            
            data = request.get_json()
            
            logger.warning(f"📥 Raw request data: {data}")
            logger.warning(f"📥 Request type: {type(data)}")
            
            if not data:
                logger.warning(f"❌ No JSON data in request")
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            trainer_name = data.get('trainer_name')
            password = data.get('password')
            
            logger.warning(f"📝 Extracted values:")
            logger.warning(f"   trainer_name: '{trainer_name}' (type: {type(trainer_name).__name__}, len: {len(trainer_name) if trainer_name else 'None'})")
            logger.warning(f"   password: [REDACTED] (len: {len(password) if password else 'None'})")
            
            if not trainer_name or not password:
                logger.warning(f"❌ Missing trainer_name or password")
                return jsonify({
                    'success': False,
                    'message': 'Trainer name and password required'
                }), 400
            
            logger.warning(f"\n🔐 Calling TrainerAuthManager.login_trainer()...")
            result = TrainerAuthManager.login_trainer(trainer_name, password)
            
            logger.warning(f"\n📤 Result from login_trainer:")
            logger.warning(f"   success: {result.get('success')}")
            logger.warning(f"   message: {result.get('message')}")
            
            if result['success']:
                # Generate JWT token
                trainer_data = {
                    'name': trainer_name,
                    'type': 'trainer'
                }
                token = generate_token(trainer_data)
                
                response_data = {
                    'success': True,
                    'token': token,
                    'trainer': result['trainer'],
                    'message': result['message']
                }
                logger.warning(f"✅ LOGIN SUCCESSFUL")
                logger.warning(f"{'='*60}\n")
                return jsonify(response_data), 200
            else:
                response_data = {
                    'success': False,
                    'message': result['message']
                }
                logger.warning(f"❌ LOGIN FAILED: {result['message']}")
                logger.warning(f"{'='*60}\n")
                return jsonify(response_data), 401
            
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            logger.error(f"❌ EXCEPTION in trainer_login ({error_type}): {error_msg}")
            import traceback
            traceback.print_exc()
            logger.error(f"{'='*60}\n")
            return jsonify({
                'success': False,
                'message': f'Login error: {error_msg}'
            }), 500
