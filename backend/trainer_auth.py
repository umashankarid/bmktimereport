"""Trainer authentication using Google Sheets"""
import hashlib
import secrets
from sheets import get_sheets_manager
import gspread

class TrainerAuthManager:
    """Manages trainer authentication with Google Sheets"""
    
    LOGIN_SHEET_NAME = 'Login'
    HEADERS = ['Trainer Name', 'Password Hash', 'Salt', 'Created Date']
    
    @staticmethod
    def hash_password(password, salt=None):
        """Hash password with salt for security"""
        if salt is None:
            salt = secrets.token_hex(16)
        
        # Create hash with salt
        pwd_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000  # iterations
        ).hex()
        
        return pwd_hash, salt
    
    @staticmethod
    def verify_password(stored_hash, password, salt):
        """Verify password against stored hash"""
        pwd_hash, _ = TrainerAuthManager.hash_password(password, salt)
        return pwd_hash == stored_hash
    
    @staticmethod
    def get_login_sheet():
        """Get or create Login sheet"""
        try:
            sheets_manager = get_sheets_manager()
            
            if not sheets_manager.authenticated or sheets_manager.demo_mode:
                raise RuntimeError("Google Sheets not configured")
            
            # Get spreadsheet
            from config import Config
            import os
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            
            spreadsheet = sheets_manager.client.open_by_key(sheet_id)
            
            # Try to get existing Login sheet
            login_sheet = None
            try:
                login_sheet = spreadsheet.worksheet(TrainerAuthManager.LOGIN_SHEET_NAME)
                print(f"✅ Login sheet found")
                return login_sheet
            except gspread.exceptions.WorksheetNotFound:
                pass
            
            # If Login sheet doesn't exist, try to create it
            try:
                print(f"⚠️  Login sheet not found, creating...")
                login_sheet = spreadsheet.add_worksheet(
                    title=TrainerAuthManager.LOGIN_SHEET_NAME,
                    rows=1000,
                    cols=4
                )
                login_sheet.append_row(TrainerAuthManager.HEADERS)
                print(f"✅ Login sheet created with headers")
                return login_sheet
            except Exception as create_error:
                # If creation fails (e.g., sheet already exists due to race condition),
                # try to get it again
                print(f"⚠️  Could not create sheet: {create_error}, trying to fetch...")
                try:
                    login_sheet = spreadsheet.worksheet(TrainerAuthManager.LOGIN_SHEET_NAME)
                    print(f"✅ Login sheet found on retry")
                    return login_sheet
                except:
                    raise create_error
            
        except Exception as e:
            print(f"❌ Error getting login sheet: {e}")
            raise
    
    @staticmethod
    def register_trainer(trainer_name, password):
        """Register a new trainer"""
        try:
            print(f"\n📝 REGISTERING TRAINER: {trainer_name}")
            
            # Validate input
            if not trainer_name or not password:
                return {
                    'success': False,
                    'message': 'Trainer name and password are required'
                }
            
            if len(password) < 6:
                return {
                    'success': False,
                    'message': 'Password must be at least 6 characters'
                }
            
            # Get login sheet
            login_sheet = TrainerAuthManager.get_login_sheet()
            
            # Check if trainer already exists
            all_trainers = login_sheet.get_all_records()
            for trainer in all_trainers:
                if trainer.get('Trainer Name', '').lower() == trainer_name.lower():
                    return {
                        'success': False,
                        'message': 'Trainer name already registered'
                    }
            
            # Hash password
            pwd_hash, salt = TrainerAuthManager.hash_password(password)
            
            # Add to sheet
            from datetime import datetime
            row = [
                trainer_name,
                pwd_hash,
                salt,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ]
            
            login_sheet.append_row(row)
            
            print(f"✅ Trainer registered: {trainer_name}")
            return {
                'success': True,
                'message': 'Registration successful'
            }
            
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return {
                'success': False,
                'message': f'Registration failed: {str(e)}'
            }
    
    @staticmethod
    def login_trainer(trainer_name, password):
        """Authenticate trainer with name and password"""
        try:
            print(f"\n🔐 LOGIN ATTEMPT: {trainer_name}")
            
            # Get login sheet
            login_sheet = TrainerAuthManager.get_login_sheet()
            
            # Find trainer by name
            all_trainers = login_sheet.get_all_records()
            trainer = None
            for t in all_trainers:
                if t.get('Trainer Name', '').lower() == trainer_name.lower():
                    trainer = t
                    break
            
            if not trainer:
                print(f"❌ Trainer not found: {trainer_name}")
                return {
                    'success': False,
                    'message': 'Trainer name or password incorrect'
                }
            
            # Verify password
            stored_hash = trainer.get('Password Hash')
            salt = trainer.get('Salt')
            
            if not TrainerAuthManager.verify_password(stored_hash, password, salt):
                print(f"❌ Invalid password for: {trainer_name}")
                return {
                    'success': False,
                    'message': 'Trainer name or password incorrect'
                }
            
            print(f"✅ Trainer authenticated: {trainer_name}")
            return {
                'success': True,
                'message': 'Login successful',
                'trainer': {
                    'name': trainer.get('Trainer Name'),
                }
            }
            
        except Exception as e:
            print(f"❌ Login error: {e}")
            return {
                'success': False,
                'message': f'Login failed: {str(e)}'
            }
