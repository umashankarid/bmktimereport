# Google Apps Script Macros - Summary

## What's New

You now have **2 reusable macros** in Google Apps Script that your website can call to query your Google Sheet:

### Macro 1: Get All Trainer Names
```
Function: getTrainerNames()
Returns: ["Coach John", "Coach Sarah", ...]
Purpose: Populate trainer dropdown automatically
```

### Macro 2: Get Activities by Trainer & Date
```
Function: getActivityByTrainerAndDate(trainerName, date)
Returns: [{activity, start, end, duration, note}, ...]
Purpose: Look up what a trainer did on a specific day
```

## Example Responses

### Get Trainer Names
```
GET https://script.google.com/macros/.../userweb?action=getTrainerNames

Response:
{
  "success": true,
  "message": "Trainer names retrieved successfully",
  "data": ["Coach John", "Coach Sarah", "Coach Mike"]
}
```

### Get Activity by Trainer & Date
```
GET https://script.google.com/macros/.../userweb?action=getActivityByTrainerAndDate&trainer=Coach%20John&date=2024-08-05

Response:
{
  "success": true,
  "message": "Found 1 activity(ies) for Coach John on 2024-08-05",
  "data": [
    {
      "activity": "Practice",
      "start": "10:30",
      "end": "11:30",
      "duration": "60",
      "note": "Great session"
    }
  ]
}
```

## Files Added

- `google-apps-script/Code.gs` - Complete Google Apps Script code
- `frontend/src/components/ActivityForm-WithGAS.jsx` - Frontend using macros
- `GAS_INTEGRATION.md` - Complete integration guide
- `GOOGLE_APPS_SCRIPT_SETUP.md` - Deployment guide
- `MACROS_SUMMARY.md` - This file

## Quick Setup (10 min)

1. Open your Google Sheet
2. Go to Extensions > Apps Script
3. Copy code from `google-apps-script/Code.gs`
4. Paste into Apps Script editor
5. Click Deploy > New deployment > Web app
6. Copy the deployment URL
7. Add to `frontend/.env`:
   ```
   REACT_APP_GAS_URL=https://your-deployment-url
   ```
8. Restart frontend
9. Done! Trainers now load from Google Sheet

## Architecture

```
Your Website
    ↓
Frontend (React)
    ↓
Google Apps Script Macros
    ↓
Your Google Sheet
```

## Use Cases

### Use Case 1: Auto-populate Trainers
Instead of fetching from backend, load directly from sheet:
```javascript
fetch(`${GAS_URL}?action=getTrainerNames`)
```

### Use Case 2: Look Up Activities
Find what a trainer did on a specific date:
```javascript
fetch(`${GAS_URL}?action=getActivityByTrainerAndDate&trainer=John&date=2024-08-05`)
```

### Use Case 3: Backend Queries
Your backend can also query via GAS:
```python
requests.get(f"{GAS_URL}?action=getTrainerNames")
```

## Key Features

✅ **Free** - Part of Google account, no additional cost
✅ **Direct Access** - No database setup needed
✅ **JSON API** - Standard REST API format
✅ **Easy to Deploy** - Deploy as Web App from Google Sheets
✅ **Accessible** - Anyone with the URL can call it
✅ **Real-time** - Always reads current sheet data

## Files Structure

```
badminton-activity-logger/
├── google-apps-script/
│   └── Code.gs                      # The macros code
├── GAS_INTEGRATION.md               # Integration guide
├── GOOGLE_APPS_SCRIPT_SETUP.md     # Deployment guide
├── MACROS_SUMMARY.md                # This file
├── frontend/
│   └── src/components/
│       ├── ActivityForm.jsx         # Original (uses backend)
│       └── ActivityForm-WithGAS.jsx # Updated (uses GAS)
└── ...
```

## Next Steps

1. Read `GAS_INTEGRATION.md` for complete guide
2. Follow `GOOGLE_APPS_SCRIPT_SETUP.md` for deployment
3. Replace `ActivityForm.jsx` with `ActivityForm-WithGAS.jsx`
4. Add `REACT_APP_GAS_URL` to `frontend/.env`
5. Test it works

## Documentation

- **GAS_INTEGRATION.md** - How to integrate macros in your code
- **GOOGLE_APPS_SCRIPT_SETUP.md** - How to deploy and test macros
- **Code.gs** - Complete commented source code

---

**Start with: GAS_INTEGRATION.md**
