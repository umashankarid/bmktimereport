import os
import json
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import jwt
from database import reset_db_manager
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

            username = data.get('username', '').strip()
            password = data.get('password', '').strip()

            if not username or not password:
                return jsonify({
                    'success': False,
                    'message': 'Username and password required'
                }), 400

            logger.warning(f"📝 Login attempt for username: {username}")
            
            # First try to get login sheet and check if user exists there
            try:
                from trainer_auth import TrainerAuthManager
            except ImportError:
                from backend.trainer_auth import TrainerAuthManager
            
            try:
                login_sheet = TrainerAuthManager.get_login_sheet()
                all_users = login_sheet.get_all_records()
                logger.warning(f"✅ Found {len(all_users)} users in Login sheet")
                
                # Look for user in Login sheet
                user_found_in_sheet = False
                for user in all_users:
                    user_name = user.get('Trainer Name', '').strip()
                    if user_name.lower() == username.lower():
                        user_found_in_sheet = True
                        user_type = user.get('Trainer Type', 'Assistant Trainer')
                        stored_hash = user.get('Password Hash', '').strip()
                        salt = user.get('Salt', '').strip()
                        
                        logger.warning(f"👤 Found user in sheet: {user_name}, has_hash: {bool(stored_hash)}")
                        
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
            
            except Exception as e:
                logger.warning(f"⚠️  Could not access Login sheet: {str(e)}, using fallback credentials only")
                all_users = []
            
            # If not found in sheet or no hash in sheet, try hardcoded admin credentials (fallback)
            logger.warning(f"🔐 Checking fallback credentials for: {username}")
            if username in ADMIN_CREDENTIALS:
                cred = ADMIN_CREDENTIALS[username]
                logger.warning(f"📋 Found fallback credential for {username}")
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
                    logger.warning(f"❌ Invalid password for fallback user: {username}, got '{password}'")
            else:
                logger.warning(f"❌ No fallback credential for: {username}")
            
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
            
            # First check if user exists in database
            from database import get_db_manager
            db = get_db_manager()
            conn = db._get_connection()
            cursor = conn.execute(
                "SELECT password_hash, salt FROM trainers WHERE LOWER(name) = LOWER(?)",
                (username.strip(),)
            )
            row = cursor.fetchone()
            conn.close()
            
            if row and row[0]:
                # User exists in DB with password - use TrainerAuthManager
                result = TrainerAuthManager.change_password(username, old_password, new_password)
                if result['success']:
                    return jsonify(result), 200
                else:
                    return jsonify(result), 401
            else:
                # User might be using fallback credentials - check and create DB entry
                if username in ADMIN_CREDENTIALS:
                    cred = ADMIN_CREDENTIALS[username]
                    if cred['password'] == old_password:
                        # Create the user in DB with the new password
                        new_hash, new_salt = TrainerAuthManager.hash_password(new_password)
                        conn = db._get_connection()
                        # Check if user already exists (might exist without password)
                        cursor = conn.execute(
                            "SELECT id FROM trainers WHERE LOWER(name) = LOWER(?)",
                            (username.strip(),)
                        )
                        existing = cursor.fetchone()
                        if existing:
                            conn.execute(
                                "UPDATE trainers SET password_hash = ?, salt = ? WHERE LOWER(name) = LOWER(?)",
                                (new_hash, new_salt, username.strip())
                            )
                        else:
                            conn.execute("""
                                INSERT INTO trainers (name, email, phone, trainer_type, password_hash, salt, created_date)
                                VALUES (?, '', '', 'Admin', ?, ?, ?)
                            """, (username.strip(), new_hash, new_salt, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
                        conn.commit()
                        conn.close()
                        
                        logger.warning(f"✅ Password changed for fallback user: {username}")
                        return jsonify({
                            'success': True,
                            'message': 'Password changed successfully'
                        }), 200
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
            
            from database import get_db_manager
            
            db = get_db_manager()
            conn = db._get_connection()
            
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
                cursor = conn.execute(
                    "SELECT id FROM trainers WHERE LOWER(name) = LOWER(?)",
                    (trainer_name,)
                )
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing user
                    conn.execute(
                        "UPDATE trainers SET password_hash = ?, salt = ?, trainer_type = 'Admin' WHERE id = ?",
                        (pwd_hash, salt, existing[0])
                    )
                    updated_count += 1
                    logger.warning(f"✅ Updated admin user: {trainer_name}")
                else:
                    # Create new admin user
                    conn.execute("""
                        INSERT INTO trainers (name, email, phone, trainer_type, password_hash, salt, created_date)
                        VALUES (?, '', '', 'Admin', ?, ?, ?)
                    """, (trainer_name, pwd_hash, salt, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
                    created_count += 1
                    logger.warning(f"✅ Created admin user: {trainer_name}")
            
            conn.commit()
            conn.close()
            
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

                # Reinitialize (no-op for SQLite but kept for compatibility)
                reset_db_manager()

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
            
            trainer_name = data.get('trainer_name', '').strip()
            password = data.get('password', '').strip()
            
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
