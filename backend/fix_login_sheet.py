#!/usr/bin/env python3
"""
Emergency script to fix corrupted Login sheet
"""
from sheets import get_sheets_manager

def fix_login_sheet():
    print("🔧 Fixing Login sheet...")
    
    # Get the sheets manager
    sheets_mgr = get_sheets_manager()
    spreadsheet = sheets_mgr.open_spreadsheet()
    
    # List all worksheets
    all_worksheets = spreadsheet.worksheets()
    worksheet_names = [ws.title for ws in all_worksheets]
    print(f"📋 Current worksheets: {worksheet_names}")
    
    # Find and delete the corrupted Login sheet
    if 'Login' in worksheet_names:
        print("❌ Found corrupted Login sheet, deleting...")
        login_sheet = spreadsheet.worksheet('Login')
        spreadsheet.del_worksheet(login_sheet)
        print("✅ Deleted corrupted Login sheet")
    
    # Now re-import and it will auto-create a fresh one
    from trainer_auth import TrainerAuthManager
    
    print("🔄 Recreating Login sheet...")
    login_sheet = TrainerAuthManager.get_login_sheet()
    print("✅ Login sheet recreated with proper headers")
    
    # Verify headers
    headers = login_sheet.row_values(1)
    print(f"✅ Headers: {headers}")

if __name__ == '__main__':
    fix_login_sheet()
