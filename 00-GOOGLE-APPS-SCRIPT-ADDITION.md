# 🎉 Google Apps Script Macros - NEW ADDITION

## What You Got

Based on your request for reusable macros, I've added:

### ✅ Macro 1: Get All Trainer Names
```javascript
getTrainerNames()
```
- Returns all unique trainer names from your sheet
- Returns as JSON array
- Perfect for auto-populating the trainer dropdown

**Response:**
```json
{
  "success": true,
  "data": ["Coach John", "Coach Sarah", "Coach Mike"]
}
```

### ✅ Macro 2: Get Activities by Trainer & Date
```javascript
getActivityByTrainerAndDate(trainerName, date)
```
- Get all activities for a specific trainer on a specific date
- Returns as JSON array with activity details
- Perfect for looking up what a trainer did

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "activity": "Training",
      "start": "17:00",
      "end": "19:00",
      "duration": "120"
    }
  ]
}
```

## Key Advantage

✨ **Your website can now:**
- Query trainer names directly from Google Sheet
- Look up activities by trainer and date
- No backend needed for read operations
- Real-time data (always fresh from sheet)

## Files Added

1. **`google-apps-script/Code.gs`** - Complete macro code (371 lines)
   - Full implementation with error handling
   - Date/time formatting utilities
   - JSON response formatting

2. **`GAS_INTEGRATION.md`** - How to use the macros
   - Code examples for React
   - Code examples for Python backend
   - Integration patterns

3. **`GOOGLE_APPS_SCRIPT_SETUP.md`** - Complete deployment guide
   - Step-by-step deployment
   - Testing instructions
   - Troubleshooting

4. **`MACROS_SUMMARY.md`** - Quick reference
   - What's included
   - Example responses
   - Quick setup

5. **`frontend/src/components/ActivityForm-WithGAS.jsx`** - Updated form component
   - Uses Google Apps Script for trainer dropdown
   - Falls back to text input if GAS not available
   - Shows data source in form

## How to Deploy (10 minutes)

### Step 1: Open Google Apps Script (2 min)
```
1. Open your Google Sheet
2. Extensions > Apps Script
3. Delete default Code.gs
```

### Step 2: Copy the Code (2 min)
```
1. Copy from: /google-apps-script/Code.gs
2. Paste into Apps Script editor
3. Save (Ctrl+S)
```

### Step 3: Deploy as Web App (3 min)
```
1. Click Deploy > New deployment > Web app
2. Execute as: Your email
3. Who has access: Anyone
4. Click Deploy
5. Copy the URL shown
```

### Step 4: Add to Frontend (3 min)
```
1. Add to frontend/.env:
   REACT_APP_GAS_URL=https://your-deployment-url
   
2. Restart frontend: npm start
```

**Done! Trainers now auto-populate from your Google Sheet.**

## What Changed

### Before (Without Macros)
- Backend API returns trainers list
- Frontend makes HTTP request to backend
- Backend reads from Google Sheet

### After (With Macros)
- Google Apps Script reads from Google Sheet directly
- Frontend can request trainers directly from GAS
- Optional: Backend can also use GAS
- More flexible, no backend needed for reads

## Code Examples

### Example 1: Fetch Trainers (React)
```javascript
const response = await fetch(
  `${process.env.REACT_APP_GAS_URL}?action=getTrainerNames`
);
const result = await response.json();
const trainers = result.data; // ["Coach1", "Coach2", ...]
```

### Example 2: Look Up Activity
```javascript
const response = await fetch(
  `${process.env.REACT_APP_GAS_URL}?action=getActivityByTrainerAndDate&trainer=CoachJohn&date=2024-08-05`
);
const result = await response.json();
// result.data = [{activity, start, end, duration}]
```

### Example 3: Python Backend Request
```python
import requests

response = requests.get(
    f"{GAS_URL}?action=getTrainerNames",
    timeout=10
)
trainers = response.json()['data']
```

## Architecture

```
┌──────────────────────────────┐
│      Your Website            │
│    (React Frontend)          │
└──────────────┬───────────────┘
               │
         ┌─────┴──────┐
         │             │
         ▼             ▼
   ┌──────────┐   ┌─────────────────┐
   │Backend   │   │Google Apps      │
   │Flask API │   │Script Macros    │
   │          │   │                 │
   │POST /api │   │GET ?action=...  │
   │(write)   │   │(read-only)      │
   └────┬─────┘   └────────┬────────┘
        │                  │
        └──────────┬───────┘
                   │
            ┌──────▼──────┐
            │ Your Google │
            │    Sheet    │
            └─────────────┘
```

## Documentation

| File | Purpose |
|------|---------|
| `00-GOOGLE-APPS-SCRIPT-ADDITION.md` | This file (overview) |
| `GAS_INTEGRATION.md` | How to integrate in your code |
| `GOOGLE_APPS_SCRIPT_SETUP.md` | Detailed deployment steps |
| `MACROS_SUMMARY.md` | Quick reference |
| `google-apps-script/Code.gs` | The macro source code |

## Getting Started

1. **Read**: `GAS_INTEGRATION.md` (5 min overview)
2. **Deploy**: `GOOGLE_APPS_SCRIPT_SETUP.md` (10 min setup)
3. **Test**: Use the test URLs in the setup guide
4. **Integrate**: Use `ActivityForm-WithGAS.jsx` or integrate manually

## Response Format

All macros return this format:

**Success:**
```json
{
  "success": true,
  "message": "Human readable message",
  "data": [array or object with your data]
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

## Macro Details

### getTrainerNames()

**No parameters**

**Returns:**
- Array of unique trainer names
- Sorted alphabetically
- Trimmed whitespace

**Example:**
```json
{
  "success": true,
  "message": "Trainer names retrieved successfully",
  "data": ["Coach John", "Coach Sarah", "Coach Mike"]
}
```

### getActivityByTrainerAndDate(trainerName, date)

**Parameters:**
- `trainerName` (string) - Name of trainer (e.g., "Coach John")
- `date` (string) - Date in YYYY-MM-DD format (e.g., "2024-08-05")

**Returns:**
- Array of activities for that trainer on that date
- Each activity includes: activity type, start time, end time, duration (calculated), note

**Example:**
```json
{
  "success": true,
  "message": "Found 1 activity(ies) for Coach John on 2024-08-05",
  "data": [
    {
      "activity": "Training",
      "start": "17:00",
      "end": "19:00",
      "duration": "120",
      "note": "Advanced techniques"
    },
    {
      "activity": "Drill",
      "start": "19:00",
      "end": "19:30",
      "duration": "30",
      "note": ""
    }
  ]
}
```

## Testing

### Test 1: Get Trainers
Paste in browser:
```
https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/userweb?action=getTrainerNames
```

### Test 2: Get Activity
```
https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/userweb?action=getActivityByTrainerAndDate&trainer=CoachName&date=2024-08-05
```

## Security Notes

✅ **Public by Design** - Anyone with the URL can query
- This is intended for public trainer data
- Data comes from your public Google Sheet
- No authentication/login needed

🔒 **If You Need Restrictions:**
- Change "Who has access" to "Me" (but then only you can use it)
- Use backend API instead (has authentication)
- Implement API key system in the script

## Support & Help

- **Integration help**: See `GAS_INTEGRATION.md`
- **Deployment help**: See `GOOGLE_APPS_SCRIPT_SETUP.md`
- **Quick reference**: See `MACROS_SUMMARY.md`
- **Source code**: See `google-apps-script/Code.gs`

## Next Steps

1. ✅ Deploy Google Apps Script (GAS_INTEGRATION.md)
2. ✅ Get deployment URL
3. ✅ Add to frontend .env
4. ✅ Test macros work
5. ✅ Update frontend components (optional: use ActivityForm-WithGAS.jsx)
6. ✅ Enjoy auto-populated trainer dropdown!

---

## Quick Links

📖 **Integration Guide**: `GAS_INTEGRATION.md`
🚀 **Deployment Guide**: `GOOGLE_APPS_SCRIPT_SETUP.md`
⚡ **Quick Reference**: `MACROS_SUMMARY.md`
💻 **Source Code**: `google-apps-script/Code.gs`

**Start with: `GAS_INTEGRATION.md`**
