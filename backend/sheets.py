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
    ALL_ACTIVITIES_SHEET = 'All Activities'
    ACTIVITIES_COLUMN = 'Activities'
    
    # Cache settings
    CACHE_TTL = 60  # Cache for 60 seconds
    
    def __init__(self, demo_mode=False):
        """Initialize Google Sheets connection"""
        self.creds = None
        self.client = None
        self.sheet = None
        self.authenticated = False
        self.demo_mode = demo_mode
        self.demo_data = []  # Store activities in memory for demo mode
        
        # Cache for frequently accessed data
        self._cache = {
            'all_activities': {'data': None, 'timestamp': None},
            'trainers': {'data': None, 'timestamp': None},
            'activity_list': {'data': None, 'timestamp': None}
        }
        
        if not demo_mode:
            self._authenticate()
            # Initialize sheets structure after authentication
            if self.authenticated and not self.demo_mode:
                try:
                    self._ensure_sheets_exist()
                except Exception as e:
                    print(f"⚠️  Could not initialize sheets structure: {e}")
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
    
    def _ensure_sheets_exist(self):
        """Ensure required sheets exist in the spreadsheet"""
        try:
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            if not sheet_id or sheet_id == "demo-sheet-id":
                return
            
            print(f"\n🔍 Checking sheet structure...")
            spreadsheet = self.client.open_by_key(sheet_id)
            all_worksheets = spreadsheet.worksheets()
            worksheet_names = [ws.title for ws in all_worksheets]
            print(f"   Current worksheets: {worksheet_names}")
            
            # Ensure Activities sheet exists
            if self.SHEET_NAME not in worksheet_names:
                print(f"⚠️  '{self.SHEET_NAME}' sheet not found, creating...")
                sheet = spreadsheet.add_worksheet(title=self.SHEET_NAME, rows=1000, cols=6)
                sheet.append_row(self.HEADERS)
                print(f"✅ '{self.SHEET_NAME}' sheet created with headers")
            
            # Ensure All Activities sheet exists
            if self.ALL_ACTIVITIES_SHEET not in worksheet_names:
                print(f"⚠️  '{self.ALL_ACTIVITIES_SHEET}' sheet not found, creating...")
                all_activities_sheet = spreadsheet.add_worksheet(
                    title=self.ALL_ACTIVITIES_SHEET,
                    rows=100,
                    cols=1
                )
                # Add header
                all_activities_sheet.append_row([self.ACTIVITIES_COLUMN])
                
                # Add default activities
                default_activities = [
                    'Practice',
                    'Drill',
                    'Match',
                    'Tournament',
                    'Conditioning',
                    'Theory',
                    'Other'
                ]
                for activity in default_activities:
                    all_activities_sheet.append_row([activity])
                
                print(f"✅ '{self.ALL_ACTIVITIES_SHEET}' sheet created with {len(default_activities)} default activities")
            else:
                print(f"✅ '{self.ALL_ACTIVITIES_SHEET}' sheet exists")
                
        except Exception as e:
            print(f"⚠️  Error ensuring sheets exist: {e}")
    
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
    
    def _parse_time(self, time_str):
        """Parse HH:MM time string to minutes since midnight"""
        try:
            hours, minutes = map(int, time_str.split(':'))
            return hours * 60 + minutes
        except:
            return None
    
    def _is_valid_time_range(self, start_time, end_time):
        """Check if time range is valid (end time >= start time)
        
        Args:
            start_time: Start time in HH:MM format
            end_time: End time in HH:MM format
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        start_min = self._parse_time(start_time)
        end_min = self._parse_time(end_time)
        
        if start_min is None or end_min is None:
            return False, f"Invalid time format: {start_time} or {end_time}"
        
        if end_min < start_min:
            return False, f"Invalid time range: End time {end_time} is before start time {start_time}"
        
        if end_min == start_min:
            return False, f"Invalid time range: End time {end_time} must be after start time {start_time}"
        
        return True, None
    
    def _times_overlap(self, start1, end1, start2, end2):
        """Check if two time ranges overlap
        
        Args:
            start1, end1: First time range (HH:MM format)
            start2, end2: Second time range (HH:MM format)
        
        Returns:
            True if ranges overlap, False otherwise
        """
        start1_min = self._parse_time(start1)
        end1_min = self._parse_time(end1)
        start2_min = self._parse_time(start2)
        end2_min = self._parse_time(end2)
        
        if None in [start1_min, end1_min, start2_min, end2_min]:
            return False
        
        # Ranges overlap if one starts before the other ends
        return start1_min < end2_min and start2_min < end1_min
    
    def _check_time_conflicts(self, trainer_name, date, new_activities):
        """Check if new activities conflict with existing activities
        
        Args:
            trainer_name: Name of trainer
            date: Date in YYYY-MM-DD format
            new_activities: List of {activity, start_time, end_time} dicts
        
        Returns:
            Tuple of (has_conflicts, conflict_details)
        """
        try:
            # Get all existing activities for this trainer on this date
            if self.demo_mode:
                existing = [
                    act for act in self.demo_data
                    if (act.get('Trainer Name', '').lower() == trainer_name.lower() and
                        act.get('Date') == date)
                ]
            else:
                sheet = self.get_sheet()
                all_records = sheet.get_all_records()
                existing = [
                    act for act in all_records
                    if (act.get('Trainer Name', '').lower() == trainer_name.lower() and
                        act.get('Date') == date)
                ]
            
            # Check for conflicts
            conflicts = []
            for new_act in new_activities:
                new_start = new_act.get('start_time')
                new_end = new_act.get('end_time')
                new_activity = new_act.get('activity', 'Unknown')
                
                for existing_act in existing:
                    existing_start = existing_act.get('Start Time', '')
                    existing_end = existing_act.get('End Time', '')
                    existing_activity = existing_act.get('Activity', '')
                    
                    if self._times_overlap(new_start, new_end, existing_start, existing_end):
                        conflicts.append({
                            'new': f"{new_activity} {new_start}-{new_end}",
                            'existing': f"{existing_activity} {existing_start}-{existing_end}",
                            'message': f"⏰ Overlap: {new_activity} ({new_start}-{new_end}) overlaps with {existing_activity} ({existing_start}-{existing_end})"
                        })
            
            return len(conflicts) > 0, conflicts
        
        except Exception as e:
            print(f"⚠️  Error checking time conflicts: {e}")
            return False, []
    
    def add_activity(self, activity_data):
        """Add one or more activities to the sheet
        
        activity_data can be:
        - Single dict with 'activity' key
        - Dict with 'activities' array, where each item has {activity, start_time, end_time}
        """
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
            
            # Check if this is multi-activity format
            if 'activities' in activity_data and isinstance(activity_data['activities'], list):
                # Multi-activity submission
                print(f"📋 Multi-activity submission with {len(activity_data['activities'])} activities")
                activities_to_log = activity_data['activities']
            else:
                # Single activity (legacy format)
                print(f"📋 Single activity submission")
                activities_to_log = [{'activity': activity_data.get('activity')}]
            
            # Validate required base fields
            required_base_fields = ['trainer_name', 'date']
            print(f"\n📋 VALIDATING REQUIRED BASE FIELDS: {required_base_fields}")
            missing_fields = []
            for field in required_base_fields:
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
            
            print(f"\n✅ Base fields valid")
            print(f"📝 Trainer: {activity_data['trainer_name']}")
            print(f"📅 Date: {activity_data['date']}")
            
            # Validate date is not in the future
            from datetime import datetime, date as date_type
            try:
                activity_date = datetime.strptime(activity_data['date'], '%Y-%m-%d').date()
                today = date_type.today()
                if activity_date > today:
                    print(f"❌ FUTURE DATE NOT ALLOWED: {activity_data['date']} is after {today}")
                    return {
                        'success': False,
                        'message': f"Cannot log activities for future dates. Date must be today or earlier."
                    }
                print(f"✅ Date validation passed: {activity_date} <= {today}")
            except ValueError as e:
                print(f"❌ INVALID DATE FORMAT: {activity_data['date']}")
                return {
                    'success': False,
                    'message': f"Invalid date format. Please use YYYY-MM-DD format."
                }
            
            # Validate time ranges for all activities (STRICT CHECK)
            print(f"\n⏱️  VALIDATING TIME RANGES (STRICT)")
            for idx, activity_item in enumerate(activities_to_log):
                start_time = activity_item.get('start_time', '')
                end_time = activity_item.get('end_time', '')
                activity_name = activity_item.get('activity', 'Unknown')
                
                # Check if times are missing
                if not start_time or not end_time:
                    print(f"❌ MISSING TIMES for {activity_name}: start={start_time}, end={end_time}")
                    return {
                        'success': False,
                        'message': f"Missing start or end time for {activity_name}"
                    }
                
                # Validate time format and range
                is_valid, error_msg = self._is_valid_time_range(start_time, end_time)
                
                if not is_valid:
                    print(f"❌ INVALID TIME RANGE for {activity_name}: {error_msg}")
                    return {
                        'success': False,
                        'message': f"Invalid time range for {activity_name}: {error_msg}"
                    }
                
                print(f"✅ Valid: {activity_name} {start_time}-{end_time}")
            
            print(f"\n✅ All time ranges valid")
            
            # Check for overlaps WITHIN new activities being submitted
            print(f"\n⏰ CHECKING FOR OVERLAPS WITHIN NEW ACTIVITIES")
            for i in range(len(activities_to_log)):
                for j in range(i + 1, len(activities_to_log)):
                    act1 = activities_to_log[i]
                    act2 = activities_to_log[j]
                    
                    if self._times_overlap(act1.get('start_time'), act1.get('end_time'), 
                                         act2.get('start_time'), act2.get('end_time')):
                        print(f"❌ OVERLAP WITHIN NEW ACTIVITIES:")
                        print(f"   {act1.get('activity')} ({act1.get('start_time')}-{act1.get('end_time')})")
                        print(f"   overlaps with")
                        print(f"   {act2.get('activity')} ({act2.get('start_time')}-{act2.get('end_time')})")
                        return {
                            'success': False,
                            'message': f"Cannot log overlapping activities: {act1.get('activity')} overlaps with {act2.get('activity')}"
                        }
            print(f"✅ No overlaps within new activities")
            
            # Check for time conflicts
            print(f"\n⏰ CHECKING FOR TIME CONFLICTS")
            has_conflicts, conflicts = self._check_time_conflicts(
                activity_data['trainer_name'],
                activity_data['date'],
                activities_to_log
            )
            
            if has_conflicts:
                print(f"❌ TIME CONFLICTS DETECTED:")
                for conflict in conflicts:
                    print(f"   {conflict['message']}")
                
                return {
                    'success': False,
                    'message': 'Time conflict detected. Cannot log overlapping activities.',
                    'conflicts': [c['message'] for c in conflicts]
                }
            
            print(f"✅ No time conflicts")
            
            # Log each activity
            logged_count = 0
            logged_activities = []
            
            for activity_item in activities_to_log:
                activity_name = activity_item.get('activity', '')
                start_time = activity_item.get('start_time', '')
                end_time = activity_item.get('end_time', '')
                
                if not activity_name or not start_time or not end_time:
                    print(f"⚠️  Skipping incomplete activity: {activity_item}")
                    continue
                
                print(f"\n📤 Logging activity: {activity_name}")
                print(f"   ⏱️  {start_time} - {end_time}")
                
                # Prepare row data - matching column order
                row = [
                    activity_data['trainer_name'],
                    activity_data['date'],
                    activity_name,
                    start_time,
                    end_time,
                    activity_data.get('note', '')
                ]
                
                print(f"   📝 ROW DATA TO APPEND:")
                for i, (header, value) in enumerate(zip(self.HEADERS, row)):
                    print(f"     Col {i}: {header} = {value}")
                
                if self.demo_mode:
                    # Demo mode: store in memory
                    print(f"   📝 DEMO MODE: Storing in memory...")
                    self.demo_data.append(dict(zip(self.HEADERS, row)))
                else:
                    # Real mode: append to Google Sheet
                    print(f"   📡 Appending row to Google Sheet...")
                    sheet = self.get_sheet()
                    sheet.append_row(row)
                
                logged_activities.append(activity_name)
                logged_count += 1
                print(f"   ✅ Activity logged")
            
            if logged_count == 0:
                print(f"❌ No activities were logged")
                return {
                    'success': False,
                    'message': 'No valid activities to log'
                }
            
            result = {
                'success': True,
                'message': f'✓ Logged {logged_count} activity/activities' + (' (DEMO MODE)' if self.demo_mode else ''),
                'count': logged_count,
                'activities': logged_activities
            }
            print(f"\n✓ Activities logged: {', '.join(logged_activities)}")
            print(f"{'='*60}\n")
            
            # Invalidate cache after adding activities
            self._invalidate_cache('all_activities')
            
            return result
        except Exception as e:
            print(f"\n❌ ERROR ADDING ACTIVITIES: {e}")
            import traceback
            print(f"Traceback:")
            traceback.print_exc()
            print(f"{'='*60}\n")
            return {
                'success': False,
                'message': f'Error logging activities: {str(e)}'
            }
    
    def _is_cache_valid(self, cache_key):
        """Check if cache is still valid"""
        cache_entry = self._cache.get(cache_key)
        if cache_entry is None or cache_entry['data'] is None or cache_entry['timestamp'] is None:
            return False
        
        elapsed = time.time() - cache_entry['timestamp']
        is_valid = elapsed < self.CACHE_TTL
        
        if is_valid:
            print(f"✅ Cache HIT for '{cache_key}' ({elapsed:.1f}s old)")
        else:
            print(f"⏰ Cache EXPIRED for '{cache_key}' ({elapsed:.1f}s old, TTL={self.CACHE_TTL}s)")
        
        return is_valid
    
    def _set_cache(self, cache_key, data):
        """Set cache value with current timestamp"""
        self._cache[cache_key] = {
            'data': data,
            'timestamp': time.time()
        }
        print(f"💾 Cache SET for '{cache_key}'")
    
    def _get_cache(self, cache_key):
        """Get cached value if valid"""
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]['data']
        return None
    
    def _invalidate_cache(self, cache_key=None):
        """Invalidate cache (all or specific)"""
        if cache_key:
            self._cache[cache_key] = {'data': None, 'timestamp': None}
            print(f"🗑️  Cache INVALIDATED for '{cache_key}'")
        else:
            for key in self._cache:
                self._cache[key] = {'data': None, 'timestamp': None}
            print(f"🗑️  All caches INVALIDATED")
    
    def get_all_activities(self, limit=100):
        """Get all activities from the sheet (with caching)"""
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
            
            # Check cache first
            cached_data = self._get_cache('all_activities')
            if cached_data is not None:
                return {
                    'success': True,
                    'data': cached_data[-limit:] if len(cached_data) > limit else cached_data,
                    'total': len(cached_data),
                    'from_cache': True
                }
            
            # Fetch from Google Sheets
            print(f"📡 Fetching activities from Google Sheets...")
            sheet = self.get_sheet()
            all_rows = sheet.get_all_records()
            
            # Cache the full result
            self._set_cache('all_activities', all_rows)
            
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

    def get_trainers_details(self):
        """Get trainers list with their details from Login sheet"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'data': [],
                    'message': 'Google Sheets not configured'
                }

            if self.demo_mode:
                # Demo mode: return empty details
                trainers = set()
                for activity in self.demo_data:
                    if activity.get('Trainer Name'):
                        trainers.add(activity['Trainer Name'])
                return {
                    'success': True,
                    'data': [{'name': t, 'email': '', 'phone': ''} for t in sorted(list(trainers))],
                    'note': 'DEMO MODE'
                }

            # Real mode: fetch from Login sheet
            try:
                from backend.trainer_auth import TrainerAuthManager
                login_sheet = TrainerAuthManager.get_login_sheet()
                all_trainers = login_sheet.get_all_records()
                
                trainers_data = []
                for trainer in all_trainers:
                    trainers_data.append({
                        'name': trainer.get('Trainer Name', ''),
                        'email': trainer.get('Email', ''),
                        'phone': trainer.get('Phone', ''),
                        'trainer_type': trainer.get('Trainer Type', 'Assistant Trainer')
                    })
                
                return {
                    'success': True,
                    'data': trainers_data
                }
            except Exception as e:
                # Fallback: just return trainer names without details
                print(f"⚠️  Could not fetch from Login sheet: {e}")
                sheet = self.get_sheet()
                all_rows = sheet.get_all_records()
                
                trainers = set()
                for row in all_rows:
                    if row.get('Trainer Name'):
                        trainers.add(row['Trainer Name'])
                
                return {
                    'success': True,
                    'data': [{'name': t, 'email': '', 'phone': '', 'trainer_type': 'Assistant Trainer'} for t in sorted(list(trainers))]
                }

        except Exception as e:
            print(f"✗ Error retrieving trainer details: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error retrieving trainer details: {str(e)}'
            }

    def get_time_report_status(self, month):
        """Get daily time report status for all trainers in a month
        
        Returns: {
            'success': True,
            'data': {
                'trainer_name': {
                    'activities': ['2026-08-01', '2026-08-02', ...]
                },
                ...
            }
        }
        """
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'data': {},
                    'message': 'Google Sheets not configured'
                }

            # Parse month
            from datetime import datetime
            month_date = datetime.strptime(month, '%Y-%m')
            year = month_date.year
            month_num = month_date.month

            if self.demo_mode:
                # Demo mode: extract from memory
                status = {}
                for activity in self.demo_data:
                    trainer = activity.get('Trainer Name')
                    date = activity.get('Date')
                    
                    if trainer and date:
                        # Check if date is in the requested month
                        try:
                            activity_date = datetime.strptime(date, '%Y-%m-%d')
                            if activity_date.year == year and activity_date.month == month_num:
                                if trainer not in status:
                                    status[trainer] = {'activities': []}
                                if date not in status[trainer]['activities']:
                                    status[trainer]['activities'].append(date)
                        except ValueError:
                            pass
                
                return {
                    'success': True,
                    'data': status
                }

            # Real mode: fetch from Google Sheets
            sheet = self.get_sheet()
            all_records = sheet.get_all_records()

            status = {}
            for record in all_records:
                trainer = record.get('Trainer Name')
                date = record.get('Date')
                
                if trainer and date:
                    # Check if date is in the requested month
                    try:
                        activity_date = datetime.strptime(date, '%Y-%m-%d')
                        if activity_date.year == year and activity_date.month == month_num:
                            if trainer not in status:
                                status[trainer] = {'activities': []}
                            if date not in status[trainer]['activities']:
                                status[trainer]['activities'].append(date)
                    except ValueError:
                        pass

            return {
                'success': True,
                'data': status
            }

        except Exception as e:
            print(f"✗ Error retrieving time report status: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'data': {},
                'message': f'Error retrieving time report status: {str(e)}'
            }

    def update_trainer(self, old_name, new_name, email='', phone=''):
        """Update trainer information in Login sheet"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'message': 'Google Sheets not configured'
                }

            if self.demo_mode:
                # Demo mode: update in memory
                for activity in self.demo_data:
                    if activity.get('Trainer Name') == old_name:
                        activity['Trainer Name'] = new_name
                return {
                    'success': True,
                    'message': f'Updated trainer {old_name} to {new_name}'
                }

            # Real mode: update in Login sheet (trainer auth data)
            from backend.trainer_auth import TrainerAuthManager
            auth_manager = TrainerAuthManager()
            result = auth_manager.update_trainer_info(old_name, new_name, email, phone)
            return result

        except Exception as e:
            print(f"✗ Error updating trainer: {e}")
            return {
                'success': False,
                'message': f'Error updating trainer: {str(e)}'
            }

    def delete_trainer(self, trainer_name):
        """Delete trainer and all their activities"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'message': 'Google Sheets not configured'
                }

            if self.demo_mode:
                # Demo mode: remove from memory
                self.demo_data = [
                    act for act in self.demo_data
                    if act.get('Trainer Name') != trainer_name
                ]
                return {
                    'success': True,
                    'message': f'Deleted trainer {trainer_name} and all their activities'
                }

            # Real mode: delete from both sheets
            print(f"🗑️  Deleting trainer: {trainer_name}")
            sheet = self.get_sheet()
            all_records = sheet.get_all_records()

            # Find and delete all rows for this trainer
            rows_to_delete = []
            for idx, record in enumerate(all_records):
                if record.get('Trainer Name', '').lower() == trainer_name.lower():
                    rows_to_delete.append(idx + 2)  # +2 because rows are 1-indexed and header is row 1

            # Delete rows in reverse order to maintain indices
            for row_idx in sorted(rows_to_delete, reverse=True):
                print(f"  Deleting row {row_idx}")
                sheet.delete_row(row_idx)

            # Also delete from Login sheet if it exists
            try:
                from backend.trainer_auth import TrainerAuthManager
                auth_manager = TrainerAuthManager()
                auth_manager.delete_trainer(trainer_name)
            except Exception as e:
                print(f"⚠️  Warning: Could not delete from Login sheet: {e}")

            return {
                'success': True,
                'message': f'Deleted trainer {trainer_name} and all their activities'
            }

        except Exception as e:
            print(f"✗ Error deleting trainer: {e}")
            return {
                'success': False,
                'message': f'Error deleting trainer: {str(e)}'
            }
    
    def get_activity_list(self):
        """Get list of all activities from 'All Activities' sheet"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'data': [],
                    'message': 'Google Sheets not configured'
                }
            
            if self.demo_mode:
                # Demo mode: return default activities
                default_activities = [
                    'Practice',
                    'Drill',
                    'Match',
                    'Tournament',
                    'Conditioning',
                    'Theory',
                    'Other'
                ]
                return {
                    'success': True,
                    'data': default_activities,
                    'note': 'DEMO MODE - using defaults'
                }
            
            # Real mode: fetch from Google Sheet
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            if not sheet_id or sheet_id == "demo-sheet-id":
                raise ValueError("GOOGLE_SHEET_ID not configured")
            
            spreadsheet = self.client.open_by_key(sheet_id)
            
            # Try to get All Activities sheet
            try:
                all_activities_sheet = spreadsheet.worksheet(self.ALL_ACTIVITIES_SHEET)
            except gspread.exceptions.WorksheetNotFound:
                print(f"⚠️  '{self.ALL_ACTIVITIES_SHEET}' sheet not found")
                return {
                    'success': False,
                    'data': [],
                    'message': f"'{self.ALL_ACTIVITIES_SHEET}' sheet not found"
                }
            
            # Get all data from the sheet
            all_data = all_activities_sheet.get_all_records()
            
            # Extract activities from the specified column
            activities = []
            for row in all_data:
                activity = row.get(self.ACTIVITIES_COLUMN, '').strip()
                if activity:  # Only include non-empty activities
                    activities.append(activity)
            
            return {
                'success': True,
                'data': activities,
                'count': len(activities)
            }
        except Exception as e:
            print(f"✗ Error retrieving activities list: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error retrieving activities: {str(e)}'
            }
    
    def get_activities_by_trainer_and_date(self, trainer_name, date):
        """Get all activities for a specific trainer on a specific date"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'data': [],
                    'message': 'Google Sheets not configured'
                }
            
            if self.demo_mode:
                # Demo mode: search in memory
                matching = [
                    act for act in self.demo_data
                    if act.get('Trainer Name', '').lower() == trainer_name.lower()
                    and act.get('Date') == date
                ]
                return {
                    'success': True,
                    'data': matching,
                    'count': len(matching),
                    'note': 'DEMO MODE'
                }
            
            # Real mode: fetch from Google Sheet
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            if not sheet_id or sheet_id == "demo-sheet-id":
                raise ValueError("GOOGLE_SHEET_ID not configured")
            
            spreadsheet = self.client.open_by_key(sheet_id)
            sheet = spreadsheet.worksheet(self.SHEET_NAME)
            
            # Get all records
            all_records = sheet.get_all_records()
            
            # Filter by trainer name and date
            matching_records = []
            for idx, record in enumerate(all_records):
                record_trainer = record.get('Trainer Name', '').lower()
                record_date = record.get('Date', '')
                
                if record_trainer == trainer_name.lower() and record_date == date:
                    # Include row number for editing
                    matching_records.append({
                        **record,
                        '_row_number': idx + 2  # +1 for header, +1 for 1-indexed
                    })
            
            return {
                'success': True,
                'data': matching_records,
                'count': len(matching_records)
            }
        except Exception as e:
            print(f"✗ Error retrieving activities: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'data': [],
                'message': f'Error retrieving activities: {str(e)}'
            }
    
    def update_activity(self, trainer_name, date, activity_name, start_time, end_time, note='', old_start_time=None, old_end_time=None):
        """Update an existing activity in the sheet"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'message': 'Google Sheets not configured'
                }
            
            if self.demo_mode:
                # Demo mode: update in memory
                for activity in self.demo_data:
                    if (activity.get('Trainer Name', '').lower() == trainer_name.lower() and
                        activity.get('Date') == date and
                        activity.get('Activity') == activity_name):
                        # If old times provided, match on those; otherwise match on first occurrence
                        if old_start_time and old_end_time:
                            if activity.get('Start Time') != old_start_time or activity.get('End Time') != old_end_time:
                                continue
                        activity['Start Time'] = start_time
                        activity['End Time'] = end_time
                        activity['Note'] = note
                        return {'success': True, 'message': 'Activity updated (DEMO MODE)'}
                
                return {'success': False, 'message': 'Activity not found'}
            
            # Real mode: update in Google Sheet
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            if not sheet_id or sheet_id == "demo-sheet-id":
                raise ValueError("GOOGLE_SHEET_ID not configured")
            
            spreadsheet = self.client.open_by_key(sheet_id)
            sheet = spreadsheet.worksheet(self.SHEET_NAME)
            
            # Get all records to find the one to update
            all_records = sheet.get_all_records()
            
            for idx, record in enumerate(all_records):
                record_trainer = record.get('Trainer Name', '').lower()
                record_date = record.get('Date', '')
                record_activity = record.get('Activity', '')
                
                if (record_trainer == trainer_name.lower() and
                    record_date == date and
                    record_activity == activity_name):
                    
                    # If old times provided, match on those to identify the specific record
                    if old_start_time and old_end_time:
                        if (record.get('Start Time') != old_start_time or 
                            record.get('End Time') != old_end_time):
                            continue
                    
                    # Found the record, update it
                    row_number = idx + 2  # +1 for header, +1 for 1-indexed
                    
                    # Update each cell
                    sheet.update_cell(row_number, 4, start_time)  # Start Time column
                    sheet.update_cell(row_number, 5, end_time)    # End Time column
                    sheet.update_cell(row_number, 6, note)        # Note column
                    
                    print(f"✅ Updated activity at row {row_number}: {activity_name} {start_time}-{end_time}")
                    
                    # Invalidate cache after updating
                    self._invalidate_cache('all_activities')
                    
                    return {
                        'success': True,
                        'message': f'Activity updated: {activity_name}',
                        'data': {
                            'trainer_name': trainer_name,
                            'date': date,
                            'activity': activity_name,
                            'start_time': start_time,
                            'end_time': end_time,
                            'note': note
                        }
                    }
            
            return {
                'success': False,
                'message': 'Activity not found'
            }
        except Exception as e:
            print(f"✗ Error updating activity: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'message': f'Error updating activity: {str(e)}'
            }
    
    def delete_activity(self, trainer_name, date, activity_name):
        """Delete an existing activity from the sheet"""
        try:
            if not self.authenticated:
                return {
                    'success': False,
                    'message': 'Google Sheets not configured'
                }
            
            if self.demo_mode:
                # Demo mode: delete from memory
                original_len = len(self.demo_data)
                self.demo_data = [
                    activity for activity in self.demo_data
                    if not (activity.get('Trainer Name', '').lower() == trainer_name.lower() and
                            activity.get('Date') == date and
                            activity.get('Activity') == activity_name)
                ]
                
                if len(self.demo_data) < original_len:
                    return {'success': True, 'message': 'Activity deleted (DEMO MODE)'}
                else:
                    return {'success': False, 'message': 'Activity not found'}
            
            # Real mode: delete from Google Sheet
            sheet_id = os.getenv('GOOGLE_SHEET_ID')
            if not sheet_id or sheet_id == "demo-sheet-id":
                raise ValueError("GOOGLE_SHEET_ID not configured")
            
            spreadsheet = self.client.open_by_key(sheet_id)
            sheet = spreadsheet.worksheet(self.SHEET_NAME)
            
            # Get all records to find the one to delete
            all_records = sheet.get_all_records()
            
            for idx, record in enumerate(all_records):
                record_trainer = record.get('Trainer Name', '').lower()
                record_date = record.get('Date', '')
                record_activity = record.get('Activity', '')
                
                if (record_trainer == trainer_name.lower() and
                    record_date == date and
                    record_activity == activity_name):
                    
                    # Found the record, delete it
                    row_number = idx + 2  # +1 for header, +1 for 1-indexed
                    sheet.delete_rows(row_number)
                    
                    print(f"✅ Deleted activity at row {row_number}: {activity_name}")
                    
                    # Invalidate cache after deleting
                    self._invalidate_cache('all_activities')
                    
                    return {
                        'success': True,
                        'message': f'Activity deleted: {activity_name}',
                        'data': {
                            'trainer_name': trainer_name,
                            'date': date,
                            'activity': activity_name
                        }
                    }
            
            return {
                'success': False,
                'message': 'Activity not found'
            }
        except Exception as e:
            print(f"✗ Error deleting activity: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'message': f'Error deleting activity: {str(e)}'
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
