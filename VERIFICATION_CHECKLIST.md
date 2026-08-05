# Verification Checklist

## Before You Start

- [ ] Google Sheet created with headers: Trainer Name, Date, Activity, Start Time, End Time, Note
- [ ] Service account has Editor access to the Google Sheet
- [ ] credentials.json downloaded and ready
- [ ] GOOGLE_SHEET_ID noted from Sheet URL

## Backend Setup

- [ ] Python 3.9+ installed
- [ ] Virtual environment created: `python3 -m venv venv`
- [ ] Virtual environment activated: `source venv/bin/activate`
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file created with:
  - [ ] GOOGLE_CREDENTIALS_PATH=credentials.json
  - [ ] GOOGLE_SHEET_ID=your-sheet-id
  - [ ] SECRET_KEY=unique-random-string
  - [ ] CORS_ORIGINS=http://localhost:3000
- [ ] credentials.json copied to backend directory
- [ ] Backend starts without errors: `python app.py`
- [ ] Health check works: `curl http://localhost:5000/api/health`

## Frontend Setup

- [ ] Node.js 16+ installed
- [ ] Dependencies installed: `npm install`
- [ ] `.env` file created with:
  - [ ] REACT_APP_API_URL=http://localhost:5000/api
- [ ] Frontend starts: `npm start`
- [ ] App loads at http://localhost:3000

## Manual Testing

### Log an Activity

1. [ ] Open http://localhost:3000
2. [ ] Click "Log Activity" tab
3. [ ] Fill form:
   - [ ] Date: (auto-filled, correct)
   - [ ] Trainer Name: Type "Test Coach"
   - [ ] Activity: Select "Practice"
   - [ ] Start Time: Enter "10:30"
   - [ ] End Time: Enter "11:30"
   - [ ] Note: Type "Test entry"
4. [ ] Click "Log Activity"
5. [ ] See success message

### Verify in Google Sheet

1. [ ] Open your Google Sheet
2. [ ] Check new row added with:
   - [ ] Trainer Name: Test Coach
   - [ ] Date: Today's date
   - [ ] Activity: Practice
   - [ ] Start Time: 10:30
   - [ ] End Time: 11:30
   - [ ] Note: Test entry

### View in History

1. [ ] Click "Activity History" tab in app
2. [ ] Click "🔄 Refresh"
3. [ ] See table with columns:
   - [ ] Date | Trainer Name | Activity | Start Time | End Time | Duration | Note
4. [ ] See your logged entry
5. [ ] Duration shows "60 min" (calculated from 10:30-11:30)

## Edge Cases

- [ ] Try submitting without required fields (should show error)
- [ ] Try with only Trainer Name and Activity (should show error)
- [ ] Add multiple activities
- [ ] Try End Time before Start Time (should calculate negative or handle gracefully)
- [ ] Add long note (should display correctly)
- [ ] Refresh history multiple times (should show all entries)

## Data Validation

Test each field:

### Trainer Name
- [ ] Can be selected from dropdown
- [ ] Can be typed as new name
- [ ] Required field validation works

### Date
- [ ] Date picker works
- [ ] Past dates allowed
- [ ] Formats correctly in sheet (YYYY-MM-DD)

### Activity
- [ ] All types show: Practice, Drill, Match, Tournament, Conditioning, Theory, Other
- [ ] Selection persists when form resets
- [ ] Shows with correct badge color in list

### Start Time
- [ ] Time picker works (HH:MM format)
- [ ] Shows correctly in table
- [ ] Formats as "HH:MM" in sheet

### End Time
- [ ] Time picker works
- [ ] Shows correctly in table
- [ ] Formats as "HH:MM" in sheet

### Note
- [ ] Optional (can be empty)
- [ ] Long text supported
- [ ] Shows in sheet and history

## API Response Testing

```bash
# Test logging activity
curl -X POST http://localhost:5000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "trainer_name": "Coach Test",
    "date": "2024-08-05",
    "activity": "Practice",
    "start_time": "10:30",
    "end_time": "11:30",
    "note": "Test note"
  }'

# Expected response:
# {"success": true, "message": "Activity logged successfully", "data": {...}}
```

## Browser Console

- [ ] No JavaScript errors
- [ ] No CORS errors
- [ ] Network requests show 201/200 status
- [ ] API responses valid

## Final Checks

- [ ] Form submits and shows success message
- [ ] Data appears in Google Sheet immediately
- [ ] History tab shows all logged activities
- [ ] No console errors
- [ ] Responsive on mobile (test with browser dev tools)

## Troubleshooting Checklist

If something doesn't work:

- [ ] Check backend console for errors
- [ ] Check browser console (F12) for errors
- [ ] Verify credentials.json is in backend folder
- [ ] Verify service account has sheet access
- [ ] Verify GOOGLE_SHEET_ID is correct
- [ ] Verify both servers running on correct ports
- [ ] Try health check endpoint first
- [ ] Check .env files have correct values
- [ ] Restart both servers

## Ready to Deploy

When all checks pass:
- [ ] Code works locally
- [ ] All required fields validated
- [ ] Google Sheet integration confirmed
- [ ] Frontend and backend communicating
- [ ] Ready for deployment to Render/Railway + Vercel/Netlify
