"""
Migration script: Import existing data from Google Sheets to SQLite database.

Run this once to populate the SQLite database with existing sheet data.
Requires Google Sheets credentials to be configured (credentials.json + .env).

Usage:
    python3 migrate_to_sqlite.py
"""
import os
import sys
import sqlite3
import time
from datetime import datetime
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def read_sheet_safe(spreadsheet, sheet_name):
    """Safely read a worksheet, return empty list if not found"""
    try:
        ws = spreadsheet.worksheet(sheet_name)
        time.sleep(1)  # Rate limit protection
        records = ws.get_all_records()
        return records
    except Exception as e:
        print(f"   ⚠️  Could not read '{sheet_name}': {e}")
        return []


def migrate():
    """Migrate all data from Google Sheets to SQLite"""
    print("=" * 60)
    print("🔄 MIGRATION: Google Sheets → SQLite")
    print("=" * 60)

    # Authenticate directly with gspread (lightweight, no heavy init)
    import gspread
    from google.oauth2.service_account import Credentials

    credentials_path = os.environ.get('GOOGLE_CREDENTIALS_PATH', 'credentials.json')
    sheet_id = os.environ.get('GOOGLE_SHEET_ID')

    if not os.path.exists(credentials_path):
        print(f"❌ Credentials file not found: {credentials_path}")
        sys.exit(1)

    if not sheet_id:
        print("❌ GOOGLE_SHEET_ID not set in .env")
        sys.exit(1)

    print(f"📄 Credentials: {credentials_path}")
    print(f"📊 Sheet ID: {sheet_id}")
    print(f"⏳ Authenticating...")

    scopes = [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
    ]

    try:
        creds = Credentials.from_service_account_file(credentials_path, scopes=scopes)
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_key(sheet_id)
        print(f"✅ Connected!")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        sys.exit(1)

    # List available worksheets
    all_worksheets = spreadsheet.worksheets()
    worksheet_names = [ws.title for ws in all_worksheets]
    print(f"📋 Available sheets: {worksheet_names}")

    # Initialize database
    from database import DatabaseManager
    db_path = os.environ.get('DATABASE_PATH', 'activities.db')
    print(f"\n📁 Database path: {db_path}")

    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"⚠️  Database already exists. Creating backup: {backup_path}")
        import shutil
        shutil.copy2(db_path, backup_path)

    db = DatabaseManager(db_path=db_path)

    # 1. Migrate Trainers (from Login sheet)
    print("\n" + "-" * 40)
    print("👥 Migrating trainers from Login sheet...")
    all_trainers = read_sheet_safe(spreadsheet, 'Login')
    if all_trainers:
        print(f"   Found {len(all_trainers)} trainers")
        conn = db._get_connection()
        migrated_trainers = 0
        for trainer in all_trainers:
            name = trainer.get('Trainer Name', '').strip()
            if not name:
                continue
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO trainers (name, email, phone, trainer_type, photo, password_hash, salt, created_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    name,
                    str(trainer.get('Email', '')),
                    str(trainer.get('Phone', '')),
                    trainer.get('Trainer Type', 'Assistant Trainer'),
                    trainer.get('Photo', ''),
                    trainer.get('Password Hash', ''),
                    trainer.get('Salt', ''),
                    str(trainer.get('Created Date', ''))
                ))
                migrated_trainers += 1
            except Exception as e:
                print(f"   ⚠️  Error migrating trainer '{name}': {e}")
        conn.commit()
        conn.close()
        print(f"   ✅ Migrated {migrated_trainers} trainers")
    else:
        print("   ⚠️  No trainers found or Login sheet doesn't exist")

    # 2. Migrate Activities
    print("\n" + "-" * 40)
    print("📝 Migrating activities...")
    activities = read_sheet_safe(spreadsheet, 'Activities')
    if activities:
        print(f"   Found {len(activities)} activities")
        conn = db._get_connection()
        migrated = 0
        for activity in activities:
            trainer_name = str(activity.get('Trainer Name', '')).strip()
            date = str(activity.get('Date', '')).strip()
            act_type = str(activity.get('Activity', '')).strip()
            start_time = str(activity.get('Start Time', '')).strip()
            end_time = str(activity.get('End Time', '')).strip()

            if not trainer_name or not date or not act_type:
                continue

            try:
                conn.execute("""
                    INSERT INTO activities (trainer_name, date, activity, start_time, end_time, note, paid)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    trainer_name,
                    date,
                    act_type,
                    start_time,
                    end_time,
                    str(activity.get('Note', '')),
                    str(activity.get('Paid', ''))
                ))
                migrated += 1
            except Exception as e:
                print(f"   ⚠️  Error migrating activity: {e}")
        conn.commit()
        conn.close()
        print(f"   ✅ Migrated {migrated} activities")
    else:
        print("   ⚠️  No activities found")

    # 3. Migrate Activity Types
    print("\n" + "-" * 40)
    print("📋 Migrating activity types...")
    activity_type_records = read_sheet_safe(spreadsheet, 'All Activities')
    if activity_type_records:
        conn = db._get_connection()
        migrated = 0
        for row in activity_type_records:
            act_type = str(row.get('Activities', '')).strip()
            if act_type:
                try:
                    conn.execute("INSERT OR IGNORE INTO activity_types (name) VALUES (?)", (act_type,))
                    migrated += 1
                except Exception as e:
                    print(f"   ⚠️  Error: {e}")
        conn.commit()
        conn.close()
        print(f"   ✅ Migrated {migrated} activity types")
    else:
        # Add defaults
        conn = db._get_connection()
        defaults = ['Practice', 'Drill', 'Match', 'Tournament', 'Conditioning', 'Theory', 'Other']
        for act in defaults:
            conn.execute("INSERT OR IGNORE INTO activity_types (name) VALUES (?)", (act,))
        conn.commit()
        conn.close()
        print(f"   ✅ Added {len(defaults)} default activity types")

    # 4. Migrate Tournaments
    print("\n" + "-" * 40)
    print("🏸 Migrating tournaments...")
    tournaments = read_sheet_safe(spreadsheet, 'Tournaments')
    if tournaments:
        print(f"   Found {len(tournaments)} tournaments")
        conn = db._get_connection()
        migrated = 0
        for t in tournaments:
            name = str(t.get('Tournament Name', '')).strip()
            if not name:
                continue
            try:
                conn.execute("""
                    INSERT OR IGNORE INTO tournaments (tournament_name, start_date, end_date, venue, start_time, end_time, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    name,
                    str(t.get('Start Date', '')),
                    str(t.get('End Date', '')),
                    str(t.get('Venue', '')),
                    str(t.get('Start Time', '')),
                    str(t.get('End Time', '')),
                    str(t.get('Status', 'Active'))
                ))
                migrated += 1
            except Exception as e:
                print(f"   ⚠️  Error migrating tournament '{name}': {e}")
        conn.commit()
        conn.close()
        print(f"   ✅ Migrated {migrated} tournaments")
    else:
        print("   ⚠️  No tournaments found or sheet doesn't exist")

    # 5. Migrate Volunteer Registrations
    print("\n" + "-" * 40)
    print("🙋 Migrating volunteer registrations...")
    registrations = read_sheet_safe(spreadsheet, 'Volunteer Registrations')
    if registrations:
        print(f"   Found {len(registrations)} registrations")
        conn = db._get_connection()
        migrated = 0
        for reg in registrations:
            vol_name = str(reg.get('Volunteer Name', '')).strip()
            tourn_name = str(reg.get('Tournament Name', '')).strip()
            if not vol_name or not tourn_name:
                continue
            try:
                conn.execute("""
                    INSERT INTO volunteer_registrations (volunteer_name, tournament_name, registration_date, status, comments)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    vol_name,
                    tourn_name,
                    str(reg.get('Registration Date', '')),
                    str(reg.get('Status', 'Registered')),
                    str(reg.get('Comments', ''))
                ))
                migrated += 1
            except Exception as e:
                print(f"   ⚠️  Error: {e}")
        conn.commit()
        conn.close()
        print(f"   ✅ Migrated {migrated} volunteer registrations")
    else:
        print("   ⚠️  No volunteer registrations found or sheet doesn't exist")

    # 6. Migrate Freezes
    print("\n" + "-" * 40)
    print("❄️  Migrating freeze entries...")
    freezes = read_sheet_safe(spreadsheet, 'Freeze Management')
    if freezes:
        print(f"   Found {len(freezes)} freeze entries")
        conn = db._get_connection()
        migrated = 0
        for freeze in freezes:
            freeze_type = str(freeze.get('Freeze Type', '')).strip()
            date_month = str(freeze.get('Date/Month', '')).strip()
            if not freeze_type or not date_month:
                continue
            try:
                conn.execute("""
                    INSERT INTO freezes (freeze_type, date_month, freeze_date, reason, created_by)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    freeze_type,
                    date_month,
                    str(freeze.get('Freeze Date', '')),
                    str(freeze.get('Reason', '')),
                    str(freeze.get('Created By', 'admin'))
                ))
                migrated += 1
            except Exception as e:
                print(f"   ⚠️  Error: {e}")
        conn.commit()
        conn.close()
        print(f"   ✅ Migrated {migrated} freeze entries")
    else:
        print("   ⚠️  No freeze entries found or sheet doesn't exist")

    # Summary
    print("\n" + "=" * 60)
    print("✅ MIGRATION COMPLETE!")
    print("=" * 60)

    # Verify counts
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    tables = ['trainers', 'activities', 'activity_types', 'tournaments', 'volunteer_registrations', 'freezes']
    print("\n📊 Database summary:")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"   {table}: {count} rows")
    conn.close()

    print(f"\n📁 Database file: {os.path.abspath(db_path)}")
    print(f"📏 File size: {os.path.getsize(db_path) / 1024:.1f} KB")
    print("\n💡 You can now run the app with: python3 app.py")


if __name__ == '__main__':
    migrate()
