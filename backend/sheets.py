import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import os
from config import Config
import threading
import time

class GoogleSheetsManager:
    """Manages Google Sheets API interactions with demo/fallback mode"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    
    SHEET_NAME = 'Activities'
    HEADERS = ['Trainer Name', 'Date', 'Activity', 'Start Time', 'End Time', 'Note']
    
    def __init__(self, demo_mode=False):
        """Initialize Google Sheets connection"""
        self.creds = None
        self.client = None
        self.sheet = None
        self.authenticated = False
        self.demo_mode = demo_mode
        self.demo_data = []  # Store activities in memory for demo mode
        
        if not demo_mode:
            self._authenticate()
        else:
            print(f"📌 DEMO MODE ENABLED: Using in-memory storage")
            print(f"   (Google Sheets connection unavailable or not configured)")
            self.authenticated = True
    
    def _authenticate(self):
        """Authenticate with Google Sheets API using service account"""
        try:
            # Get fresh credentials path from environment (not cached Config)
            credentials_path = os.getenv('GOOGLE_CREDENTIALS_PATH', 'credentials.json')
            
            if not os.path.exists(credentials_path):
                print(f"⚠️  Credentials file not found at {credentials_path}")
                print(f"   Switching to DEMO MODE...")
                # Reset to demo mode
                self.demo_mode = True
                self.authenticated = True
                return
            
            print(f"⏳ Authenticating with Google Sheets (timeout: 15s)...")
            
            # Use threading with timeout
            result = {'success': False, 'error': None}
            
            def auth_thread():
                try:
                    creds = Credentials.from_service_account_file(
                        credentials_path,
                        scopes=self.SCOPES
                    )
                    self.client = gspread.authorize(creds)
                    result['success'] = True
                    print(f"✅ Authenticated with Google Sheets API")
                except Exception as e:
                    result['error'] = str(e)
            
            thread = threading.Thread(target=auth_thread, daemon=True)
            thread.start()
            thread.join(timeout=15)  # Wait max 15 seconds
            
            if thread.is_alive():
                print(f"⚠️  Google Sheets authentication timed out (15s)")
                print(f"   This might be a network/firewall issue.")
                print(f"   Switching to DEMO MODE...")
                self.demo_mode = True
                self.authenticated = True
                return
            
            if result['success']:
                self.creds = Credentials.from_service_account_file(
                    credentials_path,
                    scopes=self.SCOPES
                )
                self.authenticated = True
            else:
                print(f"⚠️  Google Sheets authentication failed: {result['error']}")
                print(f"   Switching to DEMO MODE...")
                self.demo_mode = True
                self.authenticated = True
                
        except Exception as e:
            print(f"⚠️  Google Sheets authentication failed: {e}")
            print(f"   Switching to DEMO MODE...")
            self.demo_mode = True
            self.authenticated = True
    
    def get_sheet(self):
        """Get or create the worksheet"""
        if not self.authenticated:
            raise RuntimeError("Google Sheets not authenticated. Setup required.")
        
        if self.demo_mode:
            raise RuntimeError("Demo mode - no real sheet available")
        
        try:
            # Get fresh sheet ID from environment (not cached Config)
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            
            if not sheet_id or sheet_id == "demo-sheet-id":
                raise ValueError("GOOGLE_SHEET_ID not configured")
            
            print(f"  📖 Opening spreadsheet with ID: {sheet_id}")
            
            # Use threading with timeout
            result = {'sheet': None, 'error': None}
            
            def get_sheet_thread():
                try:
                    spreadsheet = self.client.open_by_key(sheet_id)
                    print(f"  ✅ Spreadsheet opened")
                    
                    # Try to get existing worksheet
                    try:
                        print(f"  🔍 Looking for worksheet '{self.SHEET_NAME}'...")
                        sheet = spreadsheet.worksheet(self.SHEET_NAME)
                        print(f"  ✅ Worksheet found")
                        result['sheet'] = sheet
                    except gspread.exceptions.WorksheetNotFound:
                        print(f"  ⚠️  Worksheet '{self.SHEET_NAME}' not found, creating...")
                        # Create new worksheet if it doesn't exist
                        sheet = spreadsheet.add_worksheet(title=self.SHEET_NAME, rows=1000, cols=6)
                        print(f"  ✅ Worksheet created")
                        print(f"  📝 Adding headers: {self.HEADERS}")
                        sheet.append_row(self.HEADERS)
                        print(f"  ✅ Headers added")
                        result['sheet'] = sheet
                except Exception as e:
                    result['error'] = str(e)
            
            thread = threading.Thread(target=get_sheet_thread, daemon=True)
            thread.start()
            thread.join(timeout=15)  # Wait max 15 seconds
            
            if thread.is_alive():
                raise TimeoutError("Getting Google Sheet timed out after 15 seconds. Network issue or service account lacks permissions.")
            
            if result['error']:
                raise Exception(result['error'])
            
            if result['sheet']:
                self.sheet = result['sheet']
                return self.sheet
            else:
                raise Exception("Failed to get or create worksheet")
                
        except Exception as e:
            print(f"✗ Error accessing sheet: {type(e).__name__}: {e}")
            raise
    
    def add_activity(self, activity_data):
        """Add a new activity to the sheet"""
        try:
            print(f"\n{'='*60}")
            print(f"🔍 ADD_ACTIVITY CALLED")
            print(f"{'='*60}")
            print(f"Mode: {'DEMO' if self.demo_mode else 'GOOGLE SHEETS'}")
            print(f"Authenticated: {self.authenticated}")
            
            if not self.authenticated:
                print(f"❌ Not authenticated - returning error")
                return {
                    'success': False,
                    'message': 'Google Sheets not configured. Please setup through the admin panel.'
                }
            
            # Validate required fields FIRST (before any API calls)
            required_fields = ['trainer_name', 'date', 'activity', 'start_time', 'end_time']
            print(f"\n📋 VALIDATING REQUIRED FIELDS: {required_fields}")
            missing_fields = []
            for field in required_fields:
                value = activity_data.get(field)
                print(f"  ✓ {field}: {value} (present: {bool(value)})")
                if field not in activity_data or not activity_data[field]:
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"❌ Missing fields: {missing_fields}")
                return {
                    'success': False,
                    'message': f"Missing required fields: {', '.join(missing_fields)}"
                }
            
            print(f"\n✅ All required fields present")
            print(f"📝 Trainer: {activity_data['trainer_name']}")
            print(f"📅 Date: {activity_data['date']}")
            print(f"🎯 Activity: {activity_data['activity']}")
            print(f"⏱️  Time: {activity_data['start_time']} - {activity_data['end_time']}")
            print(f"📌 Note: {activity_data.get('note', '(none)')}")
            
            # Prepare row data - matching column order
            row = [
                activity_data['trainer_name'],
                activity_data['date'],
                activity_data['activity'],
                activity_data['start_time'],
                activity_data['end_time'],
                activity_data.get('note', '')
            ]
            
            print(f"\n📤 ROW DATA TO APPEND:")
            for i, (header, value) in enumerate(zip(self.HEADERS, row)):
                print(f"  Col {i}: {header} = {value}")
            
            if self.demo_mode:
                # Demo mode: store in memory
                print(f"\n📝 DEMO MODE: Storing in memory...")
                self.demo_data.append(dict(zip(self.HEADERS, row)))
                print(f"✅ Activity stored ({len(self.demo_data)} total in demo)")
            else:
                # Real mode: append to Google Sheet
                print(f"\n📡 Appending row to Google Sheet...")
                sheet = self.get_sheet()
                sheet.append_row(row)
                print(f"✅ Row appended successfully!")
            
            result = {
                'success': True,
                'message': 'Activity logged successfully' + (' (DEMO MODE - not synced to Google Sheets)' if self.demo_mode else ''),
                'data': dict(zip(self.HEADERS, row))
            }
            print(f"\n✓ Activity added: {activity_data['trainer_name']} - {activity_data['activity']}")
            print(f"{'='*60}\n")
            
            return result
        except Exception as e:
            print(f"\n❌ ERROR ADDING ACTIVITY: {e}")
            import traceback
            print(f"Traceback:")
            traceback.print_exc()
            print(f"{'='*60}\n")
            return {
                'success': False,
                'message': f'Error logging activity: {str(e)}'
            }
    
    def get_all_activities(self, limit=100):
        """Get all activities from the sheet"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'data': [],
                    'total': 0,
                    'message': 'Google Sheets not configured'
                }
            
            if self.demo_mode:
                # Demo mode: return from memory
                print(f"📝 DEMO MODE: Retrieving {len(self.demo_data)} activities from memory")
                return {
                    'success': True,
                    'data': self.demo_data[-limit:] if len(self.demo_data) > limit else self.demo_data,
                    'total': len(self.demo_data),
                    'note': 'DEMO MODE - data not persisted'
                }
            
            sheet = self.get_sheet()
            all_rows = sheet.get_all_records()
            
            # Return limited records (most recent first)
            return {
                'success': True,
                'data': all_rows[-limit:] if len(all_rows) > limit else all_rows,
                'total': len(all_rows)
            }
        except Exception as e:
            print(f"✗ Error retrieving activities: {e}")
            return {
                'success': False,
                'data': [],
                'total': 0,
                'message': f'Error retrieving activities: {str(e)}'
            }
    
    def get_trainers(self):
        """Get unique list of trainers from the sheet"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'data': [],
                    'message': 'Google Sheets not configured'
                }
            
            if self.demo_mode:
                # Demo mode: extract from memory
                trainers = set()
                for activity in self.demo_data:
                    if activity.get('Trainer Name'):
                        trainers.add(activity['Trainer Name'])
                return {
                    'success': True,
                    'data': sorted(list(trainers)),
                    'note': 'DEMO MODE'
                }
            
            sheet = self.get_sheet()
            all_rows = sheet.get_all_records()
            
            # Extract unique trainer names
            trainers = set()
            for row in all_rows:
                if row.get('Trainer Name'):
                    trainers.add(row['Trainer Name'])
            
            return {
                'success': True,
                'data': sorted(list(trainers))
            }
        except Exception as e:
            print(f"✗ Error retrieving trainers: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error retrieving trainers: {str(e)}'
            }


# Initialize global instance
sheets_manager = None

def get_sheets_manager():
    """Get or create Google Sheets manager instance"""
    global sheets_manager
    if sheets_manager is None:
        sheets_manager = GoogleSheetsManager()
    return sheets_manager

def reset_sheets_manager():
    """Reset the sheets manager instance (used after credentials update)"""
    global sheets_manager
    sheets_manager = GoogleSheetsManager()
