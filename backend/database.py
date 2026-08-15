"""
SQLite Database Module for Badminton Activity Logger.

Drop-in replacement for GoogleSheetsManager with the same method signatures
and return formats. Uses plain sqlite3 for simplicity and thread-safety.

Usage:
    from database import get_db_manager
    db = get_db_manager()
    result = db.add_activity({...})
"""

import sqlite3
import os
import logging
from datetime import datetime, date as date_type

logger = logging.getLogger(__name__)

# Module-level singleton
_db_manager = None


def get_db_manager():
    """Get or create the DatabaseManager singleton instance.

    Returns:
        DatabaseManager: The singleton database manager instance.
    """
    global _db_manager
    if _db_manager is None:
        db_path = os.getenv('DATABASE_PATH', 'activities.db')
        _db_manager = DatabaseManager(db_path=db_path)
    return _db_manager


def reset_db_manager():
    """Reset the DatabaseManager singleton (used for testing or reconfiguration)."""
    global _db_manager
    _db_manager = None


class DatabaseManager:
    """Manages SQLite database interactions for badminton activity logging.

    Provides the same interface as GoogleSheetsManager so app.py can switch
    with minimal changes. Uses connection-per-request pattern for thread safety.

    Attributes:
        db_path (str): Path to the SQLite database file.
        authenticated (bool): Always True for SQLite (compatibility flag).
    """

    # Column headers matching Google Sheets format
    HEADERS = ['Trainer Name', 'Date', 'Activity', 'Start Time', 'End Time', 'Note', 'Paid']
    FREEZE_HEADERS = ['Freeze Type', 'Date/Month', 'Freeze Date', 'Reason', 'Created By']
    TOURNAMENTS_HEADERS = ['Tournament Name', 'Start Date', 'End Date', 'Venue', 'Start Time', 'End Time', 'Status']

    def __init__(self, db_path='activities.db'):
        """Initialize the database manager and create tables if they don't exist.

        Args:
            db_path (str): Path to the SQLite database file. Defaults to 'activities.db'.
        """
        self.db_path = db_path
        self.authenticated = True  # Always authenticated for SQLite

        self._create_tables()
        logger.info(f"✅ DatabaseManager initialized with DB: {self.db_path}")

    def _get_connection(self):
        """Get a new database connection (thread-safe pattern).

        Returns:
            sqlite3.Connection: A new connection with row_factory set to sqlite3.Row.
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _create_tables(self):
        """Create all required tables if they don't exist."""
        conn = self._get_connection()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS trainers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    email TEXT DEFAULT '',
                    phone TEXT DEFAULT '',
                    trainer_type TEXT DEFAULT 'Assistant Trainer',
                    photo TEXT DEFAULT '',
                    password_hash TEXT DEFAULT '',
                    salt TEXT DEFAULT '',
                    created_date TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trainer_name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    activity TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    note TEXT DEFAULT '',
                    paid TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS activity_types (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE
                );

                CREATE TABLE IF NOT EXISTS tournaments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tournament_name TEXT NOT NULL,
                    start_date TEXT DEFAULT '',
                    end_date TEXT DEFAULT '',
                    venue TEXT DEFAULT '',
                    start_time TEXT DEFAULT '',
                    end_time TEXT DEFAULT '',
                    status TEXT DEFAULT 'Active'
                );

                CREATE TABLE IF NOT EXISTS volunteer_registrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    volunteer_name TEXT NOT NULL,
                    tournament_name TEXT NOT NULL,
                    registration_date TEXT DEFAULT '',
                    status TEXT DEFAULT 'Registered',
                    comments TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS freezes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    freeze_type TEXT NOT NULL,
                    date_month TEXT NOT NULL,
                    freeze_date TEXT DEFAULT '',
                    reason TEXT DEFAULT '',
                    created_by TEXT DEFAULT 'admin'
                );

                CREATE INDEX IF NOT EXISTS idx_activities_trainer_date
                    ON activities(trainer_name COLLATE NOCASE, date);
                CREATE INDEX IF NOT EXISTS idx_activities_date
                    ON activities(date);
                CREATE INDEX IF NOT EXISTS idx_volunteer_reg_volunteer
                    ON volunteer_registrations(volunteer_name);
                CREATE INDEX IF NOT EXISTS idx_volunteer_reg_tournament
                    ON volunteer_registrations(tournament_name);
                CREATE INDEX IF NOT EXISTS idx_freezes_type_month
                    ON freezes(freeze_type, date_month);

                CREATE TABLE IF NOT EXISTS bills (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trainer_name TEXT NOT NULL,
                    bill_name TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    amount REAL NOT NULL,
                    payment_date TEXT NOT NULL,
                    file_data BLOB,
                    file_name TEXT DEFAULT '',
                    file_type TEXT DEFAULT '',
                    created_date TEXT DEFAULT ''
                );

                CREATE INDEX IF NOT EXISTS idx_bills_trainer
                    ON bills(trainer_name COLLATE NOCASE);
                CREATE INDEX IF NOT EXISTS idx_bills_payment_date
                    ON bills(payment_date);
            """)
            conn.commit()
        finally:
            conn.close()

    def _invalidate_cache(self, cache_key=None):
        """No-op for compatibility with GoogleSheetsManager interface.

        SQLite is fast enough that caching is unnecessary, but this method
        is retained so callers don't break.

        Args:
            cache_key (str, optional): Ignored. Kept for API compatibility.
        """
        pass

    # ──────────────────────────────────────────────────────────────────────
    # Time Utilities
    # ──────────────────────────────────────────────────────────────────────

    def _parse_time(self, time_str):
        """Parse HH:MM time string to minutes since midnight.

        Args:
            time_str (str): Time in HH:MM format.

        Returns:
            int or None: Minutes since midnight, or None if parsing fails.
        """
        try:
            parts = time_str.strip().split(':')
            hours, minutes = int(parts[0]), int(parts[1])
            return hours * 60 + minutes
        except (ValueError, IndexError, AttributeError):
            return None

    def _is_valid_time_range(self, start_time, end_time):
        """Check if a time range is valid (end > start).

        Args:
            start_time (str): Start time in HH:MM format.
            end_time (str): End time in HH:MM format.

        Returns:
            tuple: (is_valid: bool, error_message: str or None)
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
        """Check if two time ranges overlap.

        Args:
            start1 (str): First range start time (HH:MM).
            end1 (str): First range end time (HH:MM).
            start2 (str): Second range start time (HH:MM).
            end2 (str): Second range end time (HH:MM).

        Returns:
            bool: True if ranges overlap, False otherwise.
        """
        start1_min = self._parse_time(start1)
        end1_min = self._parse_time(end1)
        start2_min = self._parse_time(start2)
        end2_min = self._parse_time(end2)

        if None in [start1_min, end1_min, start2_min, end2_min]:
            return False

        return start1_min < end2_min and start2_min < end1_min

    def _check_time_conflicts(self, trainer_name, date, new_activities):
        """Check if new activities conflict with existing activities for a trainer on a date.

        Args:
            trainer_name (str): Trainer name.
            date (str): Date in YYYY-MM-DD format.
            new_activities (list): List of dicts with 'activity', 'start_time', 'end_time'.

        Returns:
            tuple: (has_conflicts: bool, conflict_details: list)
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT activity, start_time, end_time FROM activities "
                    "WHERE trainer_name = ? COLLATE NOCASE AND date = ?",
                    (trainer_name, date)
                )
                existing = cursor.fetchall()
            finally:
                conn.close()

            conflicts = []
            for new_act in new_activities:
                new_start = new_act.get('start_time', '')
                new_end = new_act.get('end_time', '')
                new_activity = new_act.get('activity', 'Unknown')

                for existing_act in existing:
                    existing_start = existing_act['start_time']
                    existing_end = existing_act['end_time']
                    existing_activity = existing_act['activity']

                    if self._times_overlap(new_start, new_end, existing_start, existing_end):
                        conflicts.append({
                            'new': f"{new_activity} {new_start}-{new_end}",
                            'existing': f"{existing_activity} {existing_start}-{existing_end}",
                            'message': (
                                f"⏰ Overlap: {new_activity} ({new_start}-{new_end}) "
                                f"overlaps with {existing_activity} ({existing_start}-{existing_end})"
                            )
                        })

            return len(conflicts) > 0, conflicts

        except Exception as e:
            logger.warning(f"⚠️  Error checking time conflicts: {e}")
            return False, []

    # ──────────────────────────────────────────────────────────────────────
    # Core Activity Methods
    # ──────────────────────────────────────────────────────────────────────

    def add_activity(self, activity_data):
        """Add one or more activities to the database.

        Handles both single activity format and multi-activity format
        (with 'activities' array). Validates dates, time ranges, and
        checks for time conflicts.

        Args:
            activity_data (dict): Activity data with keys:
                - trainer_name (str): Required.
                - date (str): Required, YYYY-MM-DD format.
                - activity (str): For single activity format.
                - activities (list): For multi-activity format, each with
                  'activity', 'start_time', 'end_time'.
                - start_time (str): For single activity format.
                - end_time (str): For single activity format.
                - note (str): Optional note.

        Returns:
            dict: {'success': bool, 'message': str, ...}
        """
        try:
            # Determine single vs multi-activity format
            if 'activities' in activity_data and isinstance(activity_data['activities'], list):
                activities_to_log = activity_data['activities']
            else:
                activities_to_log = [{
                    'activity': activity_data.get('activity', ''),
                    'start_time': activity_data.get('start_time', ''),
                    'end_time': activity_data.get('end_time', ''),
                }]

            # Validate required base fields
            required_base_fields = ['trainer_name', 'date']
            missing_fields = [
                f for f in required_base_fields
                if not activity_data.get(f)
            ]

            if missing_fields:
                return {
                    'success': False,
                    'message': f"Missing required fields: {', '.join(missing_fields)}"
                }

            trainer_name = activity_data['trainer_name']
            date_str = activity_data['date']

            # Validate date format and no future dates
            try:
                activity_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                today = date_type.today()
                if activity_date > today:
                    return {
                        'success': False,
                        'message': 'Cannot log activities for future dates. Date must be today or earlier.'
                    }
            except ValueError:
                return {
                    'success': False,
                    'message': 'Invalid date format. Please use YYYY-MM-DD format.'
                }

            # Validate time ranges for all activities
            for activity_item in activities_to_log:
                start_time = activity_item.get('start_time', '')
                end_time = activity_item.get('end_time', '')
                activity_name = activity_item.get('activity', 'Unknown')

                if not start_time or not end_time:
                    return {
                        'success': False,
                        'message': f"Missing start or end time for {activity_name}"
                    }

                if not activity_name:
                    return {
                        'success': False,
                        'message': "Missing activity name"
                    }

                is_valid, error_msg = self._is_valid_time_range(start_time, end_time)
                if not is_valid:
                    return {
                        'success': False,
                        'message': f"Invalid time range for {activity_name}: {error_msg}"
                    }

            # Check for overlaps within new activities being submitted
            for i in range(len(activities_to_log)):
                for j in range(i + 1, len(activities_to_log)):
                    act1 = activities_to_log[i]
                    act2 = activities_to_log[j]

                    if self._times_overlap(
                        act1.get('start_time'), act1.get('end_time'),
                        act2.get('start_time'), act2.get('end_time')
                    ):
                        return {
                            'success': False,
                            'message': (
                                f"Cannot log overlapping activities: "
                                f"{act1.get('activity')} overlaps with {act2.get('activity')}"
                            )
                        }

            # Check for time conflicts with existing activities
            has_conflicts, conflicts = self._check_time_conflicts(
                trainer_name, date_str, activities_to_log
            )

            if has_conflicts:
                return {
                    'success': False,
                    'message': 'Time conflict detected. Cannot log overlapping activities.',
                    'conflicts': [c['message'] for c in conflicts]
                }

            # Insert activities into database
            logged_count = 0
            logged_activities = []
            note = activity_data.get('note', '')

            conn = self._get_connection()
            try:
                for activity_item in activities_to_log:
                    activity_name = activity_item.get('activity', '')
                    start_time = activity_item.get('start_time', '')
                    end_time = activity_item.get('end_time', '')

                    if not activity_name or not start_time or not end_time:
                        continue

                    conn.execute(
                        "INSERT INTO activities (trainer_name, date, activity, start_time, end_time, note, paid) "
                        "VALUES (?, ?, ?, ?, ?, ?, '')",
                        (trainer_name, date_str, activity_name, start_time, end_time, note)
                    )
                    logged_activities.append(activity_name)
                    logged_count += 1

                conn.commit()
            finally:
                conn.close()

            if logged_count == 0:
                return {
                    'success': False,
                    'message': 'No valid activities to log'
                }

            self._invalidate_cache('all_activities')

            return {
                'success': True,
                'message': f'✓ Logged {logged_count} activity/activities',
                'count': logged_count,
                'activities': logged_activities
            }

        except Exception as e:
            logger.error(f"❌ Error adding activities: {e}")
            return {
                'success': False,
                'message': f'Error logging activities: {str(e)}'
            }

    def get_all_activities(self, limit=100):
        """Get all activities from the database, most recent first.

        Args:
            limit (int): Maximum number of activities to return. Defaults to 100.

        Returns:
            dict: {
                'success': bool,
                'data': list of dicts with sheet-header keys,
                'total': int
            }
        """
        try:
            conn = self._get_connection()
            try:
                # Get total count
                cursor = conn.execute("SELECT COUNT(*) FROM activities")
                total = cursor.fetchone()[0]

                # Get limited activities, most recent first
                cursor = conn.execute(
                    "SELECT trainer_name, date, activity, start_time, end_time, note, paid "
                    "FROM activities ORDER BY date DESC, start_time DESC LIMIT ?",
                    (limit,)
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            data = [
                {
                    'Trainer Name': row['trainer_name'],
                    'Date': row['date'],
                    'Activity': row['activity'],
                    'Start Time': row['start_time'],
                    'End Time': row['end_time'],
                    'Note': row['note'],
                    'Paid': row['paid']
                }
                for row in rows
            ]

            return {
                'success': True,
                'data': data,
                'total': total
            }

        except Exception as e:
            logger.error(f"✗ Error retrieving activities: {e}")
            return {
                'success': False,
                'data': [],
                'total': 0,
                'message': f'Error retrieving activities: {str(e)}'
            }

    def get_activities_by_trainer_and_date(self, trainer_name, date):
        """Get all activities for a specific trainer on a specific date.

        Args:
            trainer_name (str): Trainer name (case-insensitive match).
            date (str): Date in YYYY-MM-DD format.

        Returns:
            dict: {'success': bool, 'data': list, 'count': int}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT id, trainer_name, date, activity, start_time, end_time, note, paid "
                    "FROM activities "
                    "WHERE trainer_name = ? COLLATE NOCASE AND date = ? "
                    "ORDER BY start_time ASC",
                    (trainer_name, date)
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            data = [
                {
                    'Trainer Name': row['trainer_name'],
                    'Date': row['date'],
                    'Activity': row['activity'],
                    'Start Time': row['start_time'],
                    'End Time': row['end_time'],
                    'Note': row['note'],
                    'Paid': row['paid'],
                    '_row_number': row['id']  # Compatibility with sheet row references
                }
                for row in rows
            ]

            return {
                'success': True,
                'data': data,
                'count': len(data)
            }

        except Exception as e:
            logger.error(f"✗ Error retrieving activities: {e}")
            return {
                'success': False,
                'data': [],
                'count': 0,
                'message': f'Error retrieving activities: {str(e)}'
            }

    def update_activity(self, trainer_name, date, activity_name, start_time, end_time,
                        note='', old_start_time=None, old_end_time=None):
        """Update an existing activity.

        Finds the activity by trainer, date, activity name, and optionally
        old start/end times to identify the exact record.

        Args:
            trainer_name (str): Trainer name.
            date (str): Date in YYYY-MM-DD format.
            activity_name (str): Activity type name.
            start_time (str): New start time (HH:MM).
            end_time (str): New end time (HH:MM).
            note (str): New note text. Defaults to ''.
            old_start_time (str, optional): Original start time to identify record.
            old_end_time (str, optional): Original end time to identify record.

        Returns:
            dict: {'success': bool, 'message': str, 'data': dict (on success)}
        """
        try:
            # Validate new time range
            is_valid, error_msg = self._is_valid_time_range(start_time, end_time)
            if not is_valid:
                return {
                    'success': False,
                    'message': f"Invalid time range: {error_msg}"
                }

            conn = self._get_connection()
            try:
                # Build query to find the specific record
                if old_start_time and old_end_time:
                    cursor = conn.execute(
                        "SELECT id FROM activities "
                        "WHERE trainer_name = ? COLLATE NOCASE AND date = ? "
                        "AND activity = ? AND start_time = ? AND end_time = ? "
                        "LIMIT 1",
                        (trainer_name, date, activity_name, old_start_time, old_end_time)
                    )
                else:
                    cursor = conn.execute(
                        "SELECT id FROM activities "
                        "WHERE trainer_name = ? COLLATE NOCASE AND date = ? "
                        "AND activity = ? LIMIT 1",
                        (trainer_name, date, activity_name)
                    )

                row = cursor.fetchone()
                if not row:
                    return {
                        'success': False,
                        'message': 'Activity not found'
                    }

                activity_id = row['id']

                # Check for time conflicts with other activities (excluding this one)
                cursor = conn.execute(
                    "SELECT activity, start_time, end_time FROM activities "
                    "WHERE trainer_name = ? COLLATE NOCASE AND date = ? AND id != ?",
                    (trainer_name, date, activity_id)
                )
                existing = cursor.fetchall()

                for existing_act in existing:
                    if self._times_overlap(start_time, end_time,
                                          existing_act['start_time'], existing_act['end_time']):
                        return {
                            'success': False,
                            'message': (
                                f"Time conflict: overlaps with "
                                f"{existing_act['activity']} ({existing_act['start_time']}-{existing_act['end_time']})"
                            )
                        }

                # Update the record
                conn.execute(
                    "UPDATE activities SET start_time = ?, end_time = ?, note = ? WHERE id = ?",
                    (start_time, end_time, note, activity_id)
                )
                conn.commit()
            finally:
                conn.close()

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

        except Exception as e:
            logger.error(f"✗ Error updating activity: {e}")
            return {
                'success': False,
                'message': f'Error updating activity: {str(e)}'
            }

    def delete_activity_by_details(self, trainer_name, date, activity, start_time, end_time):
        """Delete a specific activity by matching all details.

        Args:
            trainer_name (str): Trainer name.
            date (str): Date in YYYY-MM-DD format.
            activity (str): Activity type name.
            start_time (str): Start time (HH:MM).
            end_time (str): End time (HH:MM).

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "DELETE FROM activities "
                    "WHERE trainer_name = ? AND date = ? AND activity = ? "
                    "AND start_time = ? AND end_time = ?",
                    (trainer_name, date, activity, start_time, end_time)
                )
                conn.commit()
                deleted = cursor.rowcount
            finally:
                conn.close()

            if deleted > 0:
                self._invalidate_cache()
                return {
                    'success': True,
                    'message': 'Activity deleted successfully'
                }
            else:
                return {
                    'success': False,
                    'message': 'Activity not found'
                }

        except Exception as e:
            logger.error(f"❌ Error deleting activity: {e}")
            return {
                'success': False,
                'message': f'Error deleting activity: {str(e)}'
            }

    def delete_activities_by_filter(self, trainer=None, activity_type=None, month=None):
        """Delete multiple activities matching filter criteria.

        All provided filters must match (AND logic). If no filters are
        provided, no activities are deleted.

        Args:
            trainer (str, optional): Filter by trainer name.
            activity_type (str, optional): Filter by activity type.
            month (str, optional): Filter by month prefix (e.g., '2026-08').

        Returns:
            dict: {'success': bool, 'deleted_count': int, 'message': str}
        """
        try:
            conditions = []
            params = []

            if trainer:
                conditions.append("trainer_name = ?")
                params.append(trainer)
            if activity_type:
                conditions.append("activity = ?")
                params.append(activity_type)
            if month:
                conditions.append("date LIKE ?")
                params.append(f"{month}%")

            if not conditions:
                return {
                    'success': True,
                    'deleted_count': 0,
                    'message': 'No filter criteria provided'
                }

            where_clause = " AND ".join(conditions)

            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    f"DELETE FROM activities WHERE {where_clause}",
                    params
                )
                conn.commit()
                deleted_count = cursor.rowcount
            finally:
                conn.close()

            if deleted_count > 0:
                self._invalidate_cache()

            return {
                'success': True,
                'deleted_count': deleted_count,
                'message': f'Deleted {deleted_count} activities'
            }

        except Exception as e:
            logger.error(f"❌ Error deleting activities by filter: {e}")
            return {
                'success': False,
                'deleted_count': 0,
                'message': f'Error deleting activities: {str(e)}'
            }

    def update_activity_paid(self, trainer_name, date, activity_name, paid_status):
        """Update the Paid status of an activity.

        Args:
            trainer_name (str): Trainer name.
            date (str): Date in YYYY-MM-DD format.
            activity_name (str): Activity type name.
            paid_status (bool or str): True/'Yes' for paid, False/'No' for unpaid.

        Returns:
            dict: {'success': bool, 'message': str, 'data': dict (on success)}
        """
        try:
            paid_value = 'Yes' if paid_status else 'No'

            conn = self._get_connection()
            try:
                # Use subquery to update only the first matching record
                cursor = conn.execute(
                    "UPDATE activities SET paid = ? WHERE id = ("
                    "  SELECT id FROM activities "
                    "  WHERE trainer_name = ? COLLATE NOCASE AND date = ? AND activity = ? "
                    "  LIMIT 1"
                    ")",
                    (paid_value, trainer_name, date, activity_name)
                )
                conn.commit()
                updated = cursor.rowcount
            finally:
                conn.close()

            if updated > 0:
                self._invalidate_cache('all_activities')
                return {
                    'success': True,
                    'message': f'Activity marked as {"paid" if paid_status else "unpaid"}',
                    'data': {
                        'trainer_name': trainer_name,
                        'date': date,
                        'activity': activity_name,
                        'paid': paid_value
                    }
                }
            else:
                return {
                    'success': False,
                    'message': 'Activity not found'
                }

        except Exception as e:
            logger.error(f"❌ Error updating activity paid status: {e}")
            return {
                'success': False,
                'message': f'Error updating activity paid status: {str(e)}'
            }

    # ──────────────────────────────────────────────────────────────────────
    # Trainer Methods
    # ──────────────────────────────────────────────────────────────────────

    def get_trainers(self):
        """Get list of all trainer names.

        Returns:
            dict: {'success': bool, 'data': list of str}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT name FROM trainers ORDER BY name"
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            return {
                'success': True,
                'data': [row['name'] for row in rows]
            }

        except Exception as e:
            logger.error(f"✗ Error retrieving trainers: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error retrieving trainers: {str(e)}'
            }

    def get_trainers_details(self):
        """Get trainers list with their details.

        Returns:
            dict: {
                'success': bool,
                'data': list of {'name', 'email', 'phone', 'trainer_type'}
            }
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT name, email, phone, trainer_type FROM trainers ORDER BY name"
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            data = [
                {
                    'name': row['name'],
                    'email': row['email'] or '',
                    'phone': row['phone'] or '',
                    'trainer_type': row['trainer_type'] or 'Assistant Trainer'
                }
                for row in rows
            ]

            return {
                'success': True,
                'data': data
            }

        except Exception as e:
            logger.error(f"✗ Error retrieving trainer details: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error retrieving trainer details: {str(e)}'
            }

    def update_trainer(self, old_name, new_name, email='', phone=''):
        """Update trainer information.

        Updates the trainer's name, email, and phone. Also updates
        the trainer_name in all associated activities.

        Args:
            old_name (str): Current trainer name.
            new_name (str): New trainer name.
            email (str): Updated email.
            phone (str): Updated phone.

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            conn = self._get_connection()
            try:
                # Check if trainer exists
                cursor = conn.execute(
                    "SELECT id FROM trainers WHERE name = ?", (old_name,)
                )
                row = cursor.fetchone()

                if not row:
                    return {
                        'success': False,
                        'message': f'Trainer "{old_name}" not found'
                    }

                # Check if new name conflicts with existing trainer
                if old_name != new_name:
                    cursor = conn.execute(
                        "SELECT id FROM trainers WHERE name = ?", (new_name,)
                    )
                    if cursor.fetchone():
                        return {
                            'success': False,
                            'message': f'Trainer "{new_name}" already exists'
                        }

                # Update trainer record
                conn.execute(
                    "UPDATE trainers SET name = ?, email = ?, phone = ? WHERE name = ?",
                    (new_name, email, phone, old_name)
                )

                # Update trainer name in activities
                if old_name != new_name:
                    conn.execute(
                        "UPDATE activities SET trainer_name = ? WHERE trainer_name = ?",
                        (new_name, old_name)
                    )

                conn.commit()
            finally:
                conn.close()

            self._invalidate_cache()
            return {
                'success': True,
                'message': f'Updated trainer {old_name} to {new_name}'
            }

        except Exception as e:
            logger.error(f"✗ Error updating trainer: {e}")
            return {
                'success': False,
                'message': f'Error updating trainer: {str(e)}'
            }

    def delete_trainer(self, trainer_name):
        """Delete a trainer and all their activities.

        Args:
            trainer_name (str): Name of the trainer to delete.

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            conn = self._get_connection()
            try:
                # Delete trainer record
                conn.execute(
                    "DELETE FROM trainers WHERE name = ? COLLATE NOCASE",
                    (trainer_name,)
                )

                # Delete all activities for this trainer
                cursor = conn.execute(
                    "DELETE FROM activities WHERE trainer_name = ? COLLATE NOCASE",
                    (trainer_name,)
                )
                deleted_activities = cursor.rowcount

                conn.commit()
            finally:
                conn.close()

            self._invalidate_cache()
            return {
                'success': True,
                'message': f'Deleted trainer {trainer_name} and all their activities'
            }

        except Exception as e:
            logger.error(f"✗ Error deleting trainer: {e}")
            return {
                'success': False,
                'message': f'Error deleting trainer: {str(e)}'
            }

    # ──────────────────────────────────────────────────────────────────────
    # Activity Types Methods
    # ──────────────────────────────────────────────────────────────────────

    def get_activities_list(self):
        """Get list of all activity type names.

        Returns:
            dict: {'success': bool, 'data': list of str}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT name FROM activity_types ORDER BY name"
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            activities = [row['name'] for row in rows]

            # If no activity types exist, return defaults
            if not activities:
                activities = [
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
                'data': activities,
                'count': len(activities)
            }

        except Exception as e:
            logger.error(f"✗ Error retrieving activities list: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error retrieving activities: {str(e)}'
            }

    def get_activity_list(self):
        """Alias for get_activities_list() for compatibility.

        Returns:
            dict: Same as get_activities_list().
        """
        return self.get_activities_list()

    # ──────────────────────────────────────────────────────────────────────
    # Tournament Methods
    # ──────────────────────────────────────────────────────────────────────

    def get_tournaments(self):
        """Get list of all tournaments.

        Returns:
            dict: {
                'success': bool,
                'data': list of dicts with tournament header keys
            }
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT tournament_name, start_date, end_date, venue, "
                    "start_time, end_time, status FROM tournaments ORDER BY start_date DESC"
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            data = [
                {
                    'Tournament Name': row['tournament_name'],
                    'Start Date': row['start_date'],
                    'End Date': row['end_date'],
                    'Venue': row['venue'],
                    'Start Time': row['start_time'],
                    'End Time': row['end_time'],
                    'Status': row['status']
                }
                for row in rows
            ]

            return {
                'success': True,
                'data': data
            }

        except Exception as e:
            logger.error(f"✗ Error fetching tournaments: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error fetching tournaments: {str(e)}'
            }

    def add_tournament(self, tournament_data):
        """Add a new tournament.

        Args:
            tournament_data (dict): Tournament data with keys:
                - 'Tournament Name' (str): Required.
                - 'Start Date' or 'Date' (str): Start date.
                - 'End Date' (str): End date.
                - 'Venue' (str): Venue name.
                - 'Start Time' (str): Start time.
                - 'End Time' (str): End time.
                - 'Status' (str): Tournament status.

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            tournament_name = tournament_data.get('Tournament Name', '')
            if not tournament_name:
                return {
                    'success': False,
                    'message': 'Tournament name is required'
                }

            start_date = tournament_data.get('Start Date', tournament_data.get('Date', ''))
            end_date = tournament_data.get('End Date', tournament_data.get('Date', ''))
            venue = tournament_data.get('Venue', '')
            start_time = tournament_data.get('Start Time', '')
            end_time = tournament_data.get('End Time', '')
            status = tournament_data.get('Status', 'Upcoming')

            conn = self._get_connection()
            try:
                conn.execute(
                    "INSERT INTO tournaments (tournament_name, start_date, end_date, venue, "
                    "start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (tournament_name, start_date, end_date, venue, start_time, end_time, status)
                )
                conn.commit()
            finally:
                conn.close()

            self._invalidate_cache('tournaments')
            return {
                'success': True,
                'message': 'Tournament added successfully'
            }

        except Exception as e:
            logger.error(f"✗ Error adding tournament: {e}")
            return {
                'success': False,
                'message': f'Error adding tournament: {str(e)}'
            }

    def tournament_exists(self, tournament_name):
        """Check if a tournament already exists by name.

        Args:
            tournament_name (str): Tournament name to check.

        Returns:
            bool: True if tournament exists, False otherwise.
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT id FROM tournaments WHERE tournament_name = ?",
                    (tournament_name,)
                )
                return cursor.fetchone() is not None
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error checking tournament existence: {e}")
            return False

    def get_tournament_volunteers(self, tournament_name):
        """Get list of volunteers registered for a specific tournament.

        Args:
            tournament_name (str): Tournament name to look up.

        Returns:
            dict: {
                'success': bool,
                'volunteers': list of {'Volunteer Name': str, 'Comments': str},
                'count': int
            }
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT volunteer_name, comments FROM volunteer_registrations "
                    "WHERE tournament_name = ? AND status = 'Registered'",
                    (tournament_name,)
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            volunteers = [
                {
                    'Volunteer Name': row['volunteer_name'],
                    'Comments': row['comments'] or ''
                }
                for row in rows
            ]

            return {
                'success': True,
                'volunteers': volunteers,
                'count': len(volunteers)
            }

        except Exception as e:
            logger.error(f"Error getting tournament volunteers: {e}")
            return {
                'success': False,
                'volunteers': [],
                'count': 0
            }

    # ──────────────────────────────────────────────────────────────────────
    # Volunteer Methods
    # ──────────────────────────────────────────────────────────────────────

    def register_volunteer(self, volunteer_name, tournament_name, comments=''):
        """Register a volunteer for a tournament.

        Prevents duplicate registration for the same tournament.

        Args:
            volunteer_name (str): Volunteer's name.
            tournament_name (str): Tournament name.
            comments (str): Optional comments.

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            conn = self._get_connection()
            try:
                # Check for existing registration
                cursor = conn.execute(
                    "SELECT id FROM volunteer_registrations "
                    "WHERE volunteer_name = ? AND tournament_name = ? AND status = 'Registered'",
                    (volunteer_name, tournament_name)
                )
                if cursor.fetchone():
                    return {
                        'success': False,
                        'message': 'Already registered for this tournament'
                    }

                registration_date = datetime.now().strftime('%Y-%m-%d')
                conn.execute(
                    "INSERT INTO volunteer_registrations "
                    "(volunteer_name, tournament_name, registration_date, status, comments) "
                    "VALUES (?, ?, ?, 'Registered', ?)",
                    (volunteer_name, tournament_name, registration_date, comments)
                )
                conn.commit()
            finally:
                conn.close()

            return {
                'success': True,
                'message': 'Successfully registered for tournament'
            }

        except Exception as e:
            logger.error(f"Error registering volunteer: {e}")
            return {
                'success': False,
                'message': f'Error registering volunteer: {str(e)}'
            }

    def unregister_volunteer(self, volunteer_name, tournament_name):
        """Unregister a volunteer from a tournament.

        Args:
            volunteer_name (str): Volunteer's name.
            tournament_name (str): Tournament name.

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "DELETE FROM volunteer_registrations "
                    "WHERE volunteer_name = ? AND tournament_name = ?",
                    (volunteer_name, tournament_name)
                )
                conn.commit()
                deleted = cursor.rowcount
            finally:
                conn.close()

            if deleted > 0:
                return {
                    'success': True,
                    'message': 'Successfully unregistered from tournament'
                }
            else:
                return {
                    'success': False,
                    'message': 'Registration not found'
                }

        except Exception as e:
            logger.error(f"Error unregistering volunteer: {e}")
            return {
                'success': False,
                'message': f'Error unregistering volunteer: {str(e)}'
            }

    def get_volunteer_registrations(self, volunteer_name):
        """Get all tournament registrations for a specific volunteer.

        Args:
            volunteer_name (str): Volunteer's name.

        Returns:
            dict: {
                'success': bool,
                'data': list of registration dicts
            }
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT volunteer_name, tournament_name, registration_date, status, comments "
                    "FROM volunteer_registrations WHERE volunteer_name = ?",
                    (volunteer_name,)
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            data = [
                {
                    'Volunteer Name': row['volunteer_name'],
                    'Tournament Name': row['tournament_name'],
                    'Registration Date': row['registration_date'],
                    'Status': row['status'],
                    'Comments': row['comments'] or ''
                }
                for row in rows
            ]

            return {
                'success': True,
                'data': data
            }

        except Exception as e:
            logger.error(f"Error fetching volunteer registrations: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error fetching volunteer registrations: {str(e)}'
            }

    def get_all_volunteer_registrations(self):
        """Get all volunteer registrations.

        Returns:
            dict: {'success': bool, 'data': list of registration dicts}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT volunteer_name, tournament_name, registration_date, status, comments "
                    "FROM volunteer_registrations ORDER BY registration_date DESC"
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            data = [
                {
                    'Volunteer Name': row['volunteer_name'],
                    'Tournament Name': row['tournament_name'],
                    'Registration Date': row['registration_date'],
                    'Status': row['status'],
                    'Comments': row['comments'] or ''
                }
                for row in rows
            ]

            return {
                'success': True,
                'data': data
            }

        except Exception as e:
            logger.error(f"Error fetching all volunteer registrations: {e}")
            return {
                'success': False,
                'data': []
            }

    def get_all_volunteers(self):
        """Get list of all unique volunteers with their info.

        Returns:
            dict: {
                'success': bool,
                'data': list of {'name': str, 'email': str, 'phone': str}
            }
        """
        try:
            conn = self._get_connection()
            try:
                # First try trainers with type 'Volunteer'
                cursor = conn.execute(
                    "SELECT name, email, phone FROM trainers WHERE trainer_type = 'Volunteer' ORDER BY name"
                )
                rows = cursor.fetchall()

                if rows:
                    data = [
                        {
                            'name': row['name'],
                            'email': row['email'] or '',
                            'phone': row['phone'] or ''
                        }
                        for row in rows
                    ]
                else:
                    # Fallback: extract unique volunteers from registrations
                    cursor = conn.execute(
                        "SELECT DISTINCT volunteer_name FROM volunteer_registrations ORDER BY volunteer_name"
                    )
                    rows = cursor.fetchall()
                    data = [
                        {
                            'name': row['volunteer_name'],
                            'email': '',
                            'phone': ''
                        }
                        for row in rows
                    ]
            finally:
                conn.close()

            return {
                'success': True,
                'data': data
            }

        except Exception as e:
            logger.error(f"❌ Error in get_all_volunteers: {e}")
            return {
                'success': False,
                'data': [],
                'message': str(e)
            }

    def update_volunteer(self, old_name, new_name, email='', phone=''):
        """Update volunteer name and contact info.

        Updates both the trainers table (if volunteer type) and all
        volunteer registrations.

        Args:
            old_name (str): Current volunteer name.
            new_name (str): New volunteer name.
            email (str): Updated email.
            phone (str): Updated phone.

        Returns:
            dict: {'success': bool, 'message': str, 'updated_count': int}
        """
        try:
            conn = self._get_connection()
            try:
                # Update in trainers table if exists
                conn.execute(
                    "UPDATE trainers SET name = ?, email = ?, phone = ? "
                    "WHERE name = ? AND trainer_type = 'Volunteer'",
                    (new_name, email, phone, old_name)
                )

                # Update in volunteer registrations
                cursor = conn.execute(
                    "UPDATE volunteer_registrations SET volunteer_name = ? WHERE volunteer_name = ?",
                    (new_name, old_name)
                )
                updated_count = cursor.rowcount

                conn.commit()
            finally:
                conn.close()

            return {
                'success': True,
                'message': f'Updated {updated_count} registration(s)',
                'updated_count': updated_count
            }

        except Exception as e:
            logger.error(f"Error updating volunteer: {e}")
            return {
                'success': False,
                'message': f'Error updating volunteer: {str(e)}'
            }

    def remove_volunteer(self, volunteer_name):
        """Remove volunteer from all registrations.

        Args:
            volunteer_name (str): Volunteer name to remove.

        Returns:
            dict: {'success': bool, 'message': str, 'removed_count': int}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "DELETE FROM volunteer_registrations WHERE volunteer_name = ?",
                    (volunteer_name,)
                )
                removed_count = cursor.rowcount

                # Also remove from trainers if they're a volunteer type
                conn.execute(
                    "DELETE FROM trainers WHERE name = ? AND trainer_type = 'Volunteer'",
                    (volunteer_name,)
                )

                conn.commit()
            finally:
                conn.close()

            return {
                'success': True,
                'message': f'Removed {removed_count} registration(s)',
                'removed_count': removed_count
            }

        except Exception as e:
            logger.error(f"Error removing volunteer: {e}")
            return {
                'success': False,
                'message': f'Error removing volunteer: {str(e)}'
            }

    # ──────────────────────────────────────────────────────────────────────
    # Freeze Methods
    # ──────────────────────────────────────────────────────────────────────

    def get_frozen_dates(self):
        """Get all frozen dates and months.

        Returns:
            dict: {
                'success': bool,
                'data': list of dicts with freeze header keys
                    ('Freeze Type', 'Date/Month', 'Freeze Date', 'Reason', 'Created By')
            }
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT freeze_type, date_month, freeze_date, reason, created_by "
                    "FROM freezes ORDER BY freeze_date DESC"
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            data = [
                {
                    'Freeze Type': row['freeze_type'],
                    'Date/Month': row['date_month'],
                    'Freeze Date': row['freeze_date'],
                    'Reason': row['reason'] or '',
                    'Created By': row['created_by'] or 'admin'
                }
                for row in rows
            ]

            return {
                'success': True,
                'data': data
            }

        except Exception as e:
            logger.error(f"Error fetching frozen dates: {e}")
            return {
                'success': False,
                'data': [],
                'message': str(e)
            }

    def get_all_freezes(self):
        """Alias for get_frozen_dates() for compatibility.

        Returns:
            dict: Same as get_frozen_dates().
        """
        return self.get_frozen_dates()

    def add_freeze(self, freeze_type, date_or_month, reason='', created_by='admin'):
        """Add a freeze entry for a date or month.

        Args:
            freeze_type (str): Type of freeze ('Date Range', 'Month', 'Date').
            date_or_month (str): The date or month value to freeze.
            reason (str): Reason for the freeze.
            created_by (str): Who created the freeze. Defaults to 'admin'.

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            freeze_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            conn = self._get_connection()
            try:
                conn.execute(
                    "INSERT INTO freezes (freeze_type, date_month, freeze_date, reason, created_by) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (freeze_type, date_or_month, freeze_date, reason, created_by)
                )
                conn.commit()
            finally:
                conn.close()

            logger.info(f"✅ Added freeze: {freeze_type} - {date_or_month}")
            return {
                'success': True,
                'message': f'Freeze added for {date_or_month}'
            }

        except Exception as e:
            logger.error(f"Error adding freeze: {e}")
            return {
                'success': False,
                'message': str(e)
            }

    def remove_freeze(self, freeze_type, date_or_month):
        """Remove a freeze entry.

        Args:
            freeze_type (str): Type of freeze to remove.
            date_or_month (str): The date/month value to unfreeze.

        Returns:
            dict: {'success': bool, 'message': str, 'removed': int}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "DELETE FROM freezes WHERE freeze_type = ? AND date_month = ?",
                    (freeze_type, date_or_month)
                )
                conn.commit()
                removed = cursor.rowcount
            finally:
                conn.close()

            logger.info(f"✅ Removed {removed} freeze entries")
            return {
                'success': True,
                'message': f'Freeze removed for {date_or_month}',
                'removed': removed
            }

        except Exception as e:
            logger.error(f"Error removing freeze: {e}")
            return {
                'success': False,
                'message': str(e)
            }

    def is_date_frozen(self, date_str):
        """Check if a specific date is frozen.

        Checks against all freeze types:
        - 'Date Range': format "YYYY-MM-DD to YYYY-MM-DD"
        - 'Month': format "YYYY-MM"
        - 'Date': format "YYYY-MM-DD"

        Args:
            date_str (str): Date to check in YYYY-MM-DD format.

        Returns:
            bool: True if the date is frozen, False otherwise.
        """
        try:
            result = self.get_frozen_dates()
            if not result['success']:
                return False

            freezes = result['data']
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')

            for freeze in freezes:
                freeze_value = freeze.get('Date/Month', '')
                freeze_type = freeze.get('Freeze Type', '')

                if freeze_type == 'Date Range':
                    # Parse date range format: "YYYY-MM-DD to YYYY-MM-DD"
                    try:
                        parts = freeze_value.split(' to ')
                        if len(parts) == 2:
                            start_date = datetime.strptime(parts[0].strip(), '%Y-%m-%d')
                            end_date = datetime.strptime(parts[1].strip(), '%Y-%m-%d')
                            if start_date <= date_obj <= end_date:
                                return True
                    except (ValueError, IndexError):
                        pass

                elif freeze_type == 'Month':
                    # Check if date is in the frozen month
                    try:
                        freeze_month = datetime.strptime(freeze_value, '%Y-%m')
                        if date_obj.year == freeze_month.year and date_obj.month == freeze_month.month:
                            return True
                    except ValueError:
                        pass

                elif freeze_type == 'Date':
                    # Direct date match
                    if freeze_value == date_str:
                        return True

            return False

        except Exception as e:
            logger.error(f"Error checking if date is frozen: {e}")
            return False

    # ──────────────────────────────────────────────────────────────────────
    # Time Report Methods
    # ──────────────────────────────────────────────────────────────────────

    def get_time_report_status(self, month, trainer_type=None):
        """Get daily activity status for trainers in a month.

        For each trainer, returns the list of dates they have logged
        activities in the given month.

        Args:
            month (str): Month in YYYY-MM format.
            trainer_type (str, optional): Filter by trainer type
                ('Assistant Trainer', 'Junior Trainer', 'Volunteer').

        Returns:
            dict: {
                'success': bool,
                'data': {
                    'trainer_name': {
                        'activities': ['YYYY-MM-DD', ...]
                    },
                    ...
                }
            }
        """
        try:
            # Parse month
            month_date = datetime.strptime(month, '%Y-%m')
            year = month_date.year
            month_num = month_date.month

            # Get trainers of specified type if filtering
            trainers_of_type = None
            if trainer_type:
                trainers_result = self.get_trainers_details()
                if trainers_result['success']:
                    trainers_of_type = [
                        t['name'] for t in trainers_result['data']
                        if t.get('trainer_type') == trainer_type
                    ]

            # Query activities for the month
            month_prefix = f"{year:04d}-{month_num:02d}"

            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT trainer_name, date FROM activities WHERE date LIKE ?",
                    (f"{month_prefix}%",)
                )
                rows = cursor.fetchall()
            finally:
                conn.close()

            status = {}
            for row in rows:
                trainer = row['trainer_name']
                activity_date = row['date']

                # Skip if trainer type filtering is on and trainer not in list
                if trainers_of_type is not None and trainer not in trainers_of_type:
                    continue

                if trainer not in status:
                    status[trainer] = {'activities': []}

                if activity_date not in status[trainer]['activities']:
                    status[trainer]['activities'].append(activity_date)

            return {
                'success': True,
                'data': status
            }

        except Exception as e:
            logger.error(f"✗ Error retrieving time report status: {e}")
            return {
                'success': False,
                'data': {},
                'message': f'Error retrieving time report status: {str(e)}'
            }

    # ==================== BILL MANAGEMENT ====================

    def add_bill(self, trainer_name, bill_name, description, amount, payment_date, file_data=None, file_name='', file_type=''):
        """Add a new bill/reimbursement request.

        Args:
            trainer_name (str): Name of the trainer submitting the bill.
            bill_name (str): Title/name of the bill.
            description (str): Description of the expense.
            amount (float): Amount in SEK.
            payment_date (str): Date of payment (YYYY-MM-DD).
            file_data (bytes, optional): Binary file data (PDF/image).
            file_name (str): Original filename.
            file_type (str): MIME type of the file.

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            if not trainer_name or not bill_name or not amount or not payment_date:
                return {
                    'success': False,
                    'message': 'Trainer name, bill name, amount, and payment date are required'
                }

            from datetime import datetime
            created_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            conn = self._get_connection()
            try:
                conn.execute("""
                    INSERT INTO bills (trainer_name, bill_name, description, amount, payment_date, file_data, file_name, file_type, created_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    trainer_name.strip(),
                    bill_name.strip(),
                    description.strip() if description else '',
                    float(amount),
                    payment_date,
                    file_data,
                    file_name,
                    file_type,
                    created_date
                ))
                conn.commit()
            finally:
                conn.close()

            return {
                'success': True,
                'message': 'Bill submitted successfully'
            }

        except Exception as e:
            logger.error(f"Error adding bill: {e}")
            return {
                'success': False,
                'message': f'Error submitting bill: {str(e)}'
            }

    def get_bills(self, trainer_name=None, month=None):
        """Get bills with optional filters.

        Args:
            trainer_name (str, optional): Filter by trainer name.
            month (str, optional): Filter by month (YYYY-MM).

        Returns:
            dict: {'success': bool, 'data': [...], 'count': int}
        """
        try:
            conn = self._get_connection()
            try:
                query = "SELECT id, trainer_name, bill_name, description, amount, payment_date, file_name, file_type, created_date FROM bills"
                params = []
                conditions = []

                if trainer_name:
                    conditions.append("LOWER(trainer_name) = LOWER(?)")
                    params.append(trainer_name.strip())

                if month:
                    conditions.append("payment_date LIKE ?")
                    params.append(f"{month}%")

                if conditions:
                    query += " WHERE " + " AND ".join(conditions)

                query += " ORDER BY payment_date DESC, created_date DESC"

                cursor = conn.execute(query, params)
                rows = cursor.fetchall()
            finally:
                conn.close()

            bills = []
            for row in rows:
                bills.append({
                    'id': row['id'],
                    'trainer_name': row['trainer_name'],
                    'bill_name': row['bill_name'],
                    'description': row['description'],
                    'amount': row['amount'],
                    'payment_date': row['payment_date'],
                    'file_name': row['file_name'],
                    'file_type': row['file_type'],
                    'created_date': row['created_date'],
                    'has_file': bool(row['file_name'])
                })

            return {
                'success': True,
                'data': bills,
                'count': len(bills)
            }

        except Exception as e:
            logger.error(f"Error getting bills: {e}")
            return {
                'success': False,
                'data': [],
                'message': f'Error retrieving bills: {str(e)}'
            }

    def get_bill_file(self, bill_id):
        """Get the file data for a specific bill.

        Args:
            bill_id (int): The bill ID.

        Returns:
            dict: {'success': bool, 'data': bytes, 'file_name': str, 'file_type': str}
        """
        try:
            conn = self._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT file_data, file_name, file_type FROM bills WHERE id = ?",
                    (bill_id,)
                )
                row = cursor.fetchone()
            finally:
                conn.close()

            if not row:
                return {
                    'success': False,
                    'message': 'Bill not found'
                }

            if not row['file_data']:
                return {
                    'success': False,
                    'message': 'No file attached to this bill'
                }

            return {
                'success': True,
                'data': row['file_data'],
                'file_name': row['file_name'],
                'file_type': row['file_type']
            }

        except Exception as e:
            logger.error(f"Error getting bill file: {e}")
            return {
                'success': False,
                'message': f'Error retrieving file: {str(e)}'
            }

    def delete_bill(self, bill_id, trainer_name=None):
        """Delete a bill. If trainer_name is provided, only delete if it belongs to that trainer.

        Args:
            bill_id (int): The bill ID to delete.
            trainer_name (str, optional): If provided, verify ownership.

        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            conn = self._get_connection()
            try:
                if trainer_name:
                    cursor = conn.execute(
                        "DELETE FROM bills WHERE id = ? AND LOWER(trainer_name) = LOWER(?)",
                        (bill_id, trainer_name.strip())
                    )
                else:
                    cursor = conn.execute("DELETE FROM bills WHERE id = ?", (bill_id,))

                conn.commit()
                deleted = cursor.rowcount
            finally:
                conn.close()

            if deleted:
                return {'success': True, 'message': 'Bill deleted'}
            else:
                return {'success': False, 'message': 'Bill not found or access denied'}

        except Exception as e:
            logger.error(f"Error deleting bill: {e}")
            return {'success': False, 'message': f'Error deleting bill: {str(e)}'}
