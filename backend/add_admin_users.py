#!/usr/bin/env python3
"""
Script to add admin users to the Login sheet
Creates two admin users: andi and sugi with initial password komet123
"""

import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from trainer_auth import TrainerAuthManager
from sheets import get_sheets_manager

def add_admin_user(trainer_name, password, email='', phone=''):
    """Add or update an admin user in the Login sheet"""
    try:
        # Get login sheet
        login_sheet = TrainerAuthManager.get_login_sheet()
        
        # Hash password
        pwd_hash, salt = TrainerAuthManager.hash_password(password)
        
        # Get all existing users
        all_users = login_sheet.get_all_records()
        
        # Check if user already exists
        user_exists = False
        user_row = None
        for idx, user in enumerate(all_users, start=2):
            if user.get('Trainer Name', '').strip() == trainer_name:
                user_exists = True
                user_row = idx
                break
        
        if user_exists and user_row:
            print(f"⚠️  User '{trainer_name}' already exists. Updating password...")
            # Update existing user
            login_sheet.update_cell(user_row, login_sheet.find('Password Hash').col, pwd_hash)
            login_sheet.update_cell(user_row, login_sheet.find('Salt').col, salt)
            print(f"✅ Updated admin user: {trainer_name}")
        else:
            print(f"➕ Adding new admin user: {trainer_name}")
            # Create new admin user row
            created_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            new_row = [
                trainer_name,      # Trainer Name
                email,             # Email
                phone,             # Phone
                'Admin',           # Trainer Type
                '',                # Photo
                pwd_hash,          # Password Hash
                salt,              # Salt
                created_date       # Created Date
            ]
            
            login_sheet.append_row(new_row)
            print(f"✅ Added admin user: {trainer_name}")
        
        return True
    
    except Exception as e:
        print(f"❌ Error adding admin user: {str(e)}")
        return False

def main():
    """Main function"""
    print("🔐 Adding Admin Users to Login Sheet")
    print("-" * 50)
    
    # Admin users to create
    admins = [
        {'name': 'andi', 'password': 'komet123'},
        {'name': 'sugi', 'password': 'komet123'}
    ]
    
    success_count = 0
    for admin in admins:
        if add_admin_user(admin['name'], admin['password']):
            success_count += 1
    
    print("-" * 50)
    print(f"✅ Added/Updated {success_count}/{len(admins)} admin users")
    print("\n📋 Admin users can now login with:")
    print("   Username: andi, Password: komet123")
    print("   Username: sugi, Password: komet123")
    print("\n⚠️  Users should change password after first login!")

if __name__ == '__main__':
    main()
