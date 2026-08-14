"""Trainer authentication using SQLite database"""
import hashlib
import secrets
import logging
from database import get_db_manager

# Use Python logging instead of print for proper output capture
logger = logging.getLogger(__name__)


class TrainerAuthManager:
    """Manages trainer authentication with SQLite database"""
    
    LOGIN_SHEET_NAME = 'Login'  # Kept for compatibility
    HEADERS = ['Trainer Name', 'Email', 'Phone', 'Trainer Type', 'Photo', 'Password Hash', 'Salt', 'Created Date']
    
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
        """Compatibility method - returns the db manager itself for code that expects a sheet-like object"""
        # Return a wrapper that mimics the sheet interface for auth.py compatibility
        return _LoginSheetCompat()
    
    @staticmethod
    def register_trainer(trainer_name, password, email='', phone='', photo_base64=None, trainer_type='Assistant Trainer'):
        """Register a new trainer"""
        try:
            logger.warning(f"\n{'='*60}")
            logger.warning(f"📝 REGISTERING TRAINER: {trainer_name}")
            logger.warning(f"{'='*60}")
            
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
            
            db = get_db_manager()
            conn = db._get_connection()
            
            # Check if trainer already exists
            cursor = conn.execute(
                "SELECT name FROM trainers WHERE LOWER(name) = LOWER(?)",
                (trainer_name.strip(),)
            )
            if cursor.fetchone():
                conn.close()
                return {
                    'success': False,
                    'message': 'Trainer name already registered'
                }
            
            # Hash password
            pwd_hash, salt = TrainerAuthManager.hash_password(password)
            
            # Add to database
            from datetime import datetime
            conn.execute("""
                INSERT INTO trainers (name, email, phone, trainer_type, photo, password_hash, salt, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trainer_name.strip(),
                email,
                phone,
                trainer_type,
                photo_base64 or '',
                pwd_hash,
                salt,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
            conn.commit()
            conn.close()
            
            logger.warning(f"✅ TRAINER REGISTERED SUCCESSFULLY: {trainer_name}")
            return {
                'success': True,
                'message': 'Registration successful'
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ ERROR in register_trainer: {error_msg}")
            import traceback
            traceback.print_exc()
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
            
            db = get_db_manager()
            conn = db._get_connection()
            
            # Find trainer by name (case-insensitive)
            cursor = conn.execute(
                "SELECT name, email, phone, trainer_type, password_hash, salt FROM trainers WHERE LOWER(name) = LOWER(?)",
                (trainer_name.strip(),)
            )
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                logger.warning(f"❌ Trainer not found: {trainer_name}")
                return {
                    'success': False,
                    'message': 'Trainer name or password incorrect'
                }
            
            stored_name, email, phone, trainer_type, stored_hash, salt = row
            
            if not stored_hash or not salt:
                logger.warning(f"❌ Missing hash or salt for trainer: {trainer_name}")
                return {
                    'success': False,
                    'message': 'Trainer account incomplete'
                }
            
            # Verify password
            is_valid = TrainerAuthManager.verify_password(stored_hash, password, salt)
            
            if not is_valid:
                logger.warning(f"❌ Invalid password for: {trainer_name}")
                return {
                    'success': False,
                    'message': 'Trainer name or password incorrect'
                }
            
            logger.warning(f"✅ Trainer authenticated: {trainer_name}")
            return {
                'success': True,
                'message': 'Login successful',
                'trainer': {
                    'name': stored_name,
                    'email': email or '',
                    'phone': phone or '',
                    'trainer_type': trainer_type or 'Assistant Trainer'
                }
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Login error: {error_msg}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'message': f'Login failed: {error_msg}'
            }

    @staticmethod
    def update_trainer_info(old_name, new_name, email='', phone=''):
        """Update trainer information in database"""
        try:
            db = get_db_manager()
            conn = db._get_connection()
            
            # Find the trainer
            cursor = conn.execute(
                "SELECT id FROM trainers WHERE LOWER(name) = LOWER(?)",
                (old_name.strip(),)
            )
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return {
                    'success': False,
                    'message': f'Trainer {old_name} not found'
                }
            
            trainer_id = row[0]
            
            # Build update query
            updates = ["name = ?"]
            params = [new_name.strip()]
            
            if email:
                updates.append("email = ?")
                params.append(email)
            if phone:
                updates.append("phone = ?")
                params.append(phone)
            
            params.append(trainer_id)
            conn.execute(f"UPDATE trainers SET {', '.join(updates)} WHERE id = ?", params)
            
            # Also update activities if name changed
            if old_name.strip().lower() != new_name.strip().lower():
                conn.execute(
                    "UPDATE activities SET trainer_name = ? WHERE LOWER(trainer_name) = LOWER(?)",
                    (new_name.strip(), old_name.strip())
                )
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': f'Updated trainer {old_name} to {new_name}'
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Error updating trainer: {str(e)}'
            }

    @staticmethod
    def delete_trainer(trainer_name):
        """Delete trainer from database"""
        try:
            db = get_db_manager()
            conn = db._get_connection()
            
            cursor = conn.execute(
                "SELECT id FROM trainers WHERE LOWER(name) = LOWER(?)",
                (trainer_name.strip(),)
            )
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return {
                    'success': False,
                    'message': f'Trainer {trainer_name} not found'
                }
            
            conn.execute("DELETE FROM trainers WHERE LOWER(name) = LOWER(?)", (trainer_name.strip(),))
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': f'Deleted trainer {trainer_name}'
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Error deleting trainer: {str(e)}'
            }

    @staticmethod
    def change_password(trainer_name, old_password, new_password):
        """Change trainer's password"""
        try:
            db = get_db_manager()
            conn = db._get_connection()
            
            # Get current hash and salt
            cursor = conn.execute(
                "SELECT password_hash, salt FROM trainers WHERE LOWER(name) = LOWER(?)",
                (trainer_name.strip(),)
            )
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return {
                    'success': False,
                    'message': 'Trainer not found'
                }
            
            stored_hash, salt = row
            
            # Verify old password
            if not TrainerAuthManager.verify_password(stored_hash, old_password, salt):
                conn.close()
                return {
                    'success': False,
                    'message': 'Current password is incorrect'
                }
            
            # Hash new password
            new_hash, new_salt = TrainerAuthManager.hash_password(new_password)
            
            # Update in database
            conn.execute(
                "UPDATE trainers SET password_hash = ?, salt = ? WHERE LOWER(name) = LOWER(?)",
                (new_hash, new_salt, trainer_name.strip())
            )
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': 'Password changed successfully'
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Error changing password: {str(e)}'
            }


class _LoginSheetCompat:
    """Compatibility wrapper that mimics gspread worksheet interface for auth.py"""
    
    def get_all_records(self):
        """Return all trainers as list of dicts (mimics sheet.get_all_records())"""
        db = get_db_manager()
        conn = db._get_connection()
        cursor = conn.execute(
            "SELECT name, email, phone, trainer_type, photo, password_hash, salt, created_date FROM trainers"
        )
        
        records = []
        for row in cursor.fetchall():
            records.append({
                'Trainer Name': row[0],
                'Email': row[1] or '',
                'Phone': row[2] or '',
                'Trainer Type': row[3] or 'Assistant Trainer',
                'Photo': row[4] or '',
                'Password Hash': row[5] or '',
                'Salt': row[6] or '',
                'Created Date': row[7] or ''
            })
        conn.close()
        return records
    
    def append_row(self, row):
        """Add a trainer row (mimics sheet.append_row())"""
        db = get_db_manager()
        conn = db._get_connection()
        
        # Row format matches HEADERS: [Trainer Name, Email, Phone, Trainer Type, Photo, Password Hash, Salt, Created Date]
        conn.execute("""
            INSERT OR REPLACE INTO trainers (name, email, phone, trainer_type, photo, password_hash, salt, created_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row[0] if len(row) > 0 else '',  # Trainer Name
            row[1] if len(row) > 1 else '',  # Email
            row[2] if len(row) > 2 else '',  # Phone
            row[3] if len(row) > 3 else 'Assistant Trainer',  # Trainer Type
            row[4] if len(row) > 4 else '',  # Photo
            row[5] if len(row) > 5 else '',  # Password Hash
            row[6] if len(row) > 6 else '',  # Salt
            row[7] if len(row) > 7 else ''   # Created Date
        ))
        conn.commit()
        conn.close()
    
    def row_values(self, row_num):
        """Get header row (only called with row_num=1)"""
        return TrainerAuthManager.HEADERS
    
    def update_cell(self, row, col, value):
        """Update a cell - used for updating trainer info"""
        # This is called by legacy code - we handle it through update_trainer_info instead
        pass
    
    def delete_row(self, row_idx):
        """Delete a row by index - not used with DB"""
        pass
