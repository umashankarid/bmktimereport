"""
Migration script: Import existing data from Google Sheets to SQLite database.

Run this once to populate the SQLite database with existing sheet data.
Requires Google Sheets credentials to be configured (same as current setup).

Usage:
    python3 migrate_to_sqlite.py
"""
import os
import sys
import sqlite3
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def migrate():
    """Migrate all data from Google Sheets to SQLite"""
    print("=" * 60)
    print("🔄 MIGRATION: Google Sheets → SQLite")
    print("=" * 60)

    # Import sheets manager (uses existing credentials)
    from sheets import get_sheets_manager
    from trainer_auth import TrainerAuthManager

    sheets = get_sheets_manager()
    if not sheets.authenticated:
        print("❌ Could not authenticate with Google Sheets!")
        print("   Make sure credentials.json and .env are configured.")
        sys.exit(1)

    if sheets.demo_mode:
        print("⚠️  Running in demo mode - no real data to migrate.")
        sys.exit(1)

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
    try:
        login_sheet = TrainerAuthManager.get_login_sheet()
        all_trainers = login_sheet.get_all_records()
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
                    trainer.get('Email', ''),
                    str(trainer.get('Phone', '')),
                    trainer.get('Trainer Type', 'Assistant Trainer'),
                    trainer.get('Photo', ''),
                    trainer.get('Password Hash', ''),
                    trainer.get('Salt', ''),
                    trainer.get('Created Date', '')
                ))
                migrated_trainers += 1
            except Exception as e:
                print(f"   ⚠️  Error migrating trainer '{name}': {e}")
        conn.commit()
        conn.close()
        print(f"   ✅ Migrated {migrated_trainers} trainers")
    except Exception as e:
        print(f"   ❌ Error migrating trainers: {e}")
        import traceback
        traceback.print_exc()

    # 2. Migrate Activities
    print("\n" + "-" * 40)
    print("📝 Migrating activities...")
    try:
        result = sheets.get_all_activities(limit=10000)
        if result['success']:
            activities = result['data']
            print(f"   Found {len(activities)} activities")

            conn = db._get_connection()
            migrated = 0
            for activity in activities:
                trainer_name = activity.get('Trainer Name', '').strip()
                date = activity.get('Date', '').strip()
                act_type = activity.get('Activity', '').strip()
                start_time = activity.get('Start Time', '').strip()
                end_time = activity.get('End Time', '').strip()

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
                        activity.get('Note', ''),
                        str(activity.get('Paid', ''))
                    ))
                    migrated += 1
                except Exception as e:
                    print(f"   ⚠️  Error migrating activity: {e}")
            conn.commit()
            conn.close()
            print(f"   ✅ Migrated {migrated} activities")
        else:
            print(f"   ❌ Failed to fetch activities: {result.get('message')}")
    except Exception as e:
        print(f"   ❌ Error migrating activities: {e}")
        import traceback
        traceback.print_exc()

    # 3. Migrate Activity Types
    print("\n" + "-" * 40)
    print("📋 Migrating activity types...")
    try:
        result = sheets.get_activity_list()
        if result['success']:
            activity_types = result['data']
            print(f"   Found {len(activity_types)} activity types")

            conn = db._get_connection()
            migrated = 0
            for act_type in activity_types:
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
            print(f"   ❌ Failed to fetch activity types: {result.get('message')}")
    except Exception as e:
        print(f"   ❌ Error migrating activity types: {e}")

    # 4. Migrate Tournaments
    print("\n" + "-" * 40)
    print("🏸 Migrating tournaments...")
    try:
        result = sheets.get_tournaments()
        if result['success']:
            tournaments = result['data']
            print(f"   Found {len(tournaments)} tournaments")

            conn = db._get_connection()
            migrated = 0
            for t in tournaments:
                name = t.get('Tournament Name', '').strip()
                if not name:
                    continue
                try:
                    conn.execute("""
                        INSERT OR IGNORE INTO tournaments (tournament_name, start_date, end_date, venue, start_time, end_time, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        name,
                        t.get('Start Date', ''),
                        t.get('End Date', ''),
                        t.get('Venue', ''),
                        t.get('Start Time', ''),
                        t.get('End Time', ''),
                        t.get('Status', 'Active')
                    ))
                    migrated += 1
                except Exception as e:
                    print(f"   ⚠️  Error migrating tournament '{name}': {e}")
            conn.commit()
            conn.close()
            print(f"   ✅ Migrated {migrated} tournaments")
        else:
            print(f"   ❌ Failed to fetch tournaments: {result.get('message')}")
    except Exception as e:
        print(f"   ❌ Error migrating tournaments: {e}")

    # 5. Migrate Volunteer Registrations
    print("\n" + "-" * 40)
    print("🙋 Migrating volunteer registrations...")
    try:
        result = sheets.get_all_volunteer_registrations()
        if result['success']:
            registrations = result['data']
            print(f"   Found {len(registrations)} registrations")

            conn = db._get_connection()
            migrated = 0
            for reg in registrations:
                vol_name = reg.get('Volunteer Name', '').strip()
                tourn_name = reg.get('Tournament Name', '').strip()
                if not vol_name or not tourn_name:
                    continue
                try:
                    conn.execute("""
                        INSERT INTO volunteer_registrations (volunteer_name, tournament_name, registration_date, status, comments)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        vol_name,
                        tourn_name,
                        reg.get('Registration Date', ''),
                        reg.get('Status', 'Registered'),
                        reg.get('Comments', '')
                    ))
                    migrated += 1
                except Exception as e:
                    print(f"   ⚠️  Error: {e}")
            conn.commit()
            conn.close()
            print(f"   ✅ Migrated {migrated} volunteer registrations")
        else:
            print(f"   ❌ Failed to fetch registrations: {result.get('message')}")
    except Exception as e:
        print(f"   ❌ Error migrating volunteer registrations: {e}")

    # 6. Migrate Freezes
    print("\n" + "-" * 40)
    print("❄️  Migrating freeze entries...")
    try:
        result = sheets.get_frozen_dates()
        if result['success']:
            freezes = result['data']
            print(f"   Found {len(freezes)} freeze entries")

            conn = db._get_connection()
            migrated = 0
            for freeze in freezes:
                freeze_type = freeze.get('Freeze Type', '').strip()
                date_month = freeze.get('Date/Month', '').strip()
                if not freeze_type or not date_month:
                    continue
                try:
                    conn.execute("""
                        INSERT INTO freezes (freeze_type, date_month, freeze_date, reason, created_by)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        freeze_type,
                        date_month,
                        freeze.get('Freeze Date', ''),
                        freeze.get('Reason', ''),
                        freeze.get('Created By', 'admin')
                    ))
                    migrated += 1
                except Exception as e:
                    print(f"   ⚠️  Error: {e}")
            conn.commit()
            conn.close()
            print(f"   ✅ Migrated {migrated} freeze entries")
        else:
            print(f"   ❌ Failed to fetch freezes: {result.get('message')}")
    except Exception as e:
        print(f"   ❌ Error migrating freezes: {e}")

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
    print("\n💡 Next steps:")
    print("   1. Update app.py to use 'from database import get_db_manager'")
    print("   2. Remove cache.py dependency")
    print("   3. Restart the server")


if __name__ == '__main__':
    migrate()
