"""Trainer authentication using Google Sheets"""
import hashlib
import secrets
from sheets import get_sheets_manager
import gspread
import logging

# Use Python logging instead of print for proper output capture
logger = logging.getLogger(__name__)

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
        """Get or create Login sheet - with robust error handling"""
        try:
            sheets_manager = get_sheets_manager()
            
            if not sheets_manager.authenticated or sheets_manager.demo_mode:
                raise RuntimeError("Google Sheets not configured")
            
            from config import Config
            import os
            import time
            
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            
            logger.warning(f"\n🔍 Attempting to get Login sheet for ID: {sheet_id}")
            spreadsheet = sheets_manager.client.open_by_key(sheet_id)
            
            # Get all existing worksheets first
            logger.warning(f"📋 Fetching all worksheets...")
            all_worksheets = spreadsheet.worksheets()
            worksheet_names = [ws.title for ws in all_worksheets]
            logger.warning(f"📋 Existing worksheets: {worksheet_names}")
            
            # Check if Login sheet exists
            if TrainerAuthManager.LOGIN_SHEET_NAME in worksheet_names:
                logger.warning(f"✅ Login sheet exists, checking if it needs repair...")
                login_sheet = spreadsheet.worksheet(TrainerAuthManager.LOGIN_SHEET_NAME)
                
                # Check if headers are correct
                headers = login_sheet.row_values(1)
                logger.warning(f"   Current headers: {headers}")
                
                # If headers don't match expected, rebuild the sheet
                if headers != TrainerAuthManager.HEADERS:
                    logger.warning(f"❌ Headers corrupted! Expected: {TrainerAuthManager.HEADERS}")
                    logger.warning(f"   Deleting and recreating Login sheet...")
                    spreadsheet.del_worksheet(login_sheet)
                    
                    # Recreate it
                    login_sheet = spreadsheet.add_worksheet(
                        title=TrainerAuthManager.LOGIN_SHEET_NAME,
                        rows=1000,
                        cols=4
                    )
                    logger.warning(f"✅ New Login sheet created")
                    
                    # Add headers
                    logger.warning(f"📝 Adding headers...")
                    login_sheet.append_row(TrainerAuthManager.HEADERS)
                    logger.warning(f"✅ Headers added: {TrainerAuthManager.HEADERS}")
                else:
                    logger.warning(f"✅ Headers are correct")
                
                logger.warning(f"✅ Login sheet retrieved successfully")
                return login_sheet
            
            # If Login sheet doesn't exist, create it
            logger.warning(f"⚠️  Login sheet doesn't exist, creating new one...")
            try:
                login_sheet = spreadsheet.add_worksheet(
                    title=TrainerAuthManager.LOGIN_SHEET_NAME,
                    rows=1000,
                    cols=4
                )
                logger.warning(f"✅ Login sheet created")
                
                # Add headers
                logger.warning(f"📝 Adding headers...")
                login_sheet.append_row(TrainerAuthManager.HEADERS)
                logger.warning(f"✅ Headers added: {TrainerAuthManager.HEADERS}")
                
                return login_sheet
            except Exception as create_error:
                error_msg = str(create_error)
                logger.error(f"❌ Error creating sheet: {error_msg}")
                
                # If it's a "sheet already exists" error, retry fetching
                if "already exists" in error_msg or "ALREADY_EXISTS" in error_msg:
                    logger.warning(f"📍 Sheet exists but wasn't in list, retrying fetch...")
                    time.sleep(1)  # Wait a moment
                    
                    # Refresh worksheet list
                    all_worksheets = spreadsheet.worksheets()
                    worksheet_names = [ws.title for ws in all_worksheets]
                    logger.warning(f"📋 Updated worksheets: {worksheet_names}")
                    
                    if TrainerAuthManager.LOGIN_SHEET_NAME in worksheet_names:
                        login_sheet = spreadsheet.worksheet(TrainerAuthManager.LOGIN_SHEET_NAME)
                        logger.warning(f"✅ Login sheet retrieved on retry")
                        return login_sheet
                
                raise create_error
            
        except Exception as e:
            logger.error(f"❌ Error in get_login_sheet: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    @staticmethod
    def register_trainer(trainer_name, password):
        """Register a new trainer"""
        try:
            print(f"\n{'='*60}")
            print(f"📝 REGISTERING TRAINER: {trainer_name}")
            print(f"{'='*60}")
            
            # Validate input
            if not trainer_name or not password:
                print(f"❌ Missing fields")
                return {
                    'success': False,
                    'message': 'Trainer name and password are required'
                }
            
            if len(password) < 6:
                print(f"❌ Password too short")
                return {
                    'success': False,
                    'message': 'Password must be at least 6 characters'
                }
            
            # Get login sheet
            print(f"🔗 Getting login sheet...")
            login_sheet = TrainerAuthManager.get_login_sheet()
            print(f"✅ Got login sheet")
            
            # Check if trainer already exists
            print(f"🔍 Checking for existing trainer: {trainer_name}")
            try:
                all_trainers = login_sheet.get_all_records()
                print(f"📋 Found {len(all_trainers)} existing trainers")
                
                for trainer in all_trainers:
                    existing_name = trainer.get('Trainer Name', '').lower()
                    print(f"  - Checking against: {existing_name}")
                    if existing_name == trainer_name.lower():
                        print(f"❌ Trainer already exists: {trainer_name}")
                        return {
                            'success': False,
                            'message': 'Trainer name already registered'
                        }
            except Exception as check_error:
                print(f"⚠️  Error checking existing trainers: {check_error}")
                # Continue anyway - better to allow duplicate than fail
            
            # Hash password
            print(f"🔐 Hashing password...")
            pwd_hash, salt = TrainerAuthManager.hash_password(password)
            print(f"✅ Password hashed")
            
            # Add to sheet
            print(f"📝 Preparing row data...")
            from datetime import datetime
            row = [
                trainer_name,
                pwd_hash,
                salt,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ]
            print(f"📝 Row data: {row[0]}, [hash], [salt], {row[3]}")
            
            print(f"📤 Appending to sheet...")
            login_sheet.append_row(row)
            print(f"✅ Appended to sheet")
            
            print(f"✅ TRAINER REGISTERED SUCCESSFULLY: {trainer_name}")
            print(f"{'='*60}\n")
            return {
                'success': True,
                'message': 'Registration successful'
            }
            
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"❌ ERROR in register_trainer ({error_type}): {error_msg}")
            import traceback
            traceback.print_exc()
            print(f"{'='*60}\n")
            return {
                'success': False,
                'message': f'Registration failed: {error_msg}'
            }
    
    @staticmethod
    def login_trainer(trainer_name, password):
        """Authenticate trainer with name and password"""
        try:
            logger.warning(f"\n{'='*60}")
            logger.warning(f"🔐 LOGIN ATTEMPT: {trainer_name}")
            logger.warning(f"{'='*60}")
            
            # Get login sheet
            logger.warning(f"🔗 Getting login sheet...")
            login_sheet = TrainerAuthManager.get_login_sheet()
            logger.warning(f"✅ Got login sheet")
            
            # Find trainer by name
            logger.warning(f"📋 Fetching all trainers...")
            try:
                logger.warning(f"   Calling get_all_records()...")
                all_trainers = login_sheet.get_all_records()
                logger.warning(f"✅ get_all_records() returned successfully")
                logger.warning(f"📋 Total trainers in sheet: {len(all_trainers)}")
                logger.warning(f"📋 Raw trainer records:")
                for idx, record in enumerate(all_trainers):
                    logger.warning(f"     [{idx}] {record}")
            except Exception as record_error:
                logger.error(f"❌ ERROR getting records: {type(record_error).__name__}: {record_error}")
                import traceback
                traceback.print_exc()
                raise
            
            trainer = None
            for idx, t in enumerate(all_trainers):
                stored_name = t.get('Trainer Name', '')
                stored_name_lower = stored_name.lower()
                input_name_lower = trainer_name.lower()
                
                logger.warning(f"  [{idx}] Stored: '{stored_name}' (lower: '{stored_name_lower}')")
                logger.warning(f"       Input:  '{trainer_name}' (lower: '{input_name_lower}')")
                logger.warning(f"       Match: {stored_name_lower == input_name_lower}")
                
                if stored_name_lower == input_name_lower:
                    trainer = t
                    logger.warning(f"  ✅ MATCH FOUND at index {idx}")
                    break
            
            if not trainer:
                logger.warning(f"❌ Trainer not found: {trainer_name}")
                logger.warning(f"   Available trainers: {[t.get('Trainer Name', '?') for t in all_trainers]}")
                return {
                    'success': False,
                    'message': 'Trainer name or password incorrect'
                }
            
            logger.warning(f"\n🔐 VERIFYING PASSWORD")
            # Verify password
            stored_hash = trainer.get('Password Hash')
            salt = trainer.get('Salt')
            
            logger.warning(f"  Stored Hash (first 20 chars): {stored_hash[:20] if stored_hash else 'NONE'}...")
            logger.warning(f"  Salt (first 20 chars): {salt[:20] if salt else 'NONE'}...")
            logger.warning(f"  Input password length: {len(password)}")
            
            if not stored_hash or not salt:
                logger.warning(f"❌ Missing hash or salt in sheet")
                return {
                    'success': False,
                    'message': 'Trainer account incomplete'
                }
            
            # Verify
            is_valid = TrainerAuthManager.verify_password(stored_hash, password, salt)
            logger.warning(f"  Password verification result: {is_valid}")
            
            if not is_valid:
                logger.warning(f"❌ Invalid password for: {trainer_name}")
                logger.warning(f"   Recalculating hash to debug...")
                recalc_hash, _ = TrainerAuthManager.hash_password(password, salt)
                logger.warning(f"   Recalculated (first 20): {recalc_hash[:20]}...")
                logger.warning(f"   Stored (first 20):       {stored_hash[:20]}...")
                logger.warning(f"   Match: {recalc_hash == stored_hash}")
                
                return {
                    'success': False,
                    'message': 'Trainer name or password incorrect'
                }
            
            logger.warning(f"✅ Trainer authenticated: {trainer_name}")
            logger.warning(f"{'='*60}\n")
            return {
                'success': True,
                'message': 'Login successful',
                'trainer': {
                    'name': trainer.get('Trainer Name'),
                }
            }
            
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            logger.error(f"❌ Login error ({error_type}): {error_msg}")
            import traceback
            traceback.print_exc()
            logger.error(f"{'='*60}\n")
            return {
                'success': False,
                'message': f'Login failed: {error_msg}'
            }
