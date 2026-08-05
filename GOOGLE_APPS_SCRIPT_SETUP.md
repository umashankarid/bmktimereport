# Google Apps Script Macros - Setup Guide

## Overview

Google Apps Script (GAS) creates server-side functions that your website can call to fetch data directly from your Google Sheet. This complements your backend API.

**Two Macros Available:**
1. `getTrainerNames()` - Returns all unique trainer names
2. `getActivityByTrainerAndDate(trainerName, date)` - Returns activities for a specific trainer on a specific date

## Why Use Google Apps Script?

✅ No additional server needed
✅ Direct Google Sheet access
✅ Free (part of Google account)
✅ Can be called from frontend or backend
✅ Returns JSON data

## Setup Steps

### Step 1: Open Apps Script Editor

1. Open your Google Sheet
2. Click **Extensions** (top menu)
3. Click **Apps Script**
4. A new tab will open with the Apps Script editor

### Step 2: Copy the Code

1. Delete the default `Code.gs` content
2. Copy the entire content from: `/google-apps-script/Code.gs`
3. Paste into the Apps Script editor
4. Save (Ctrl+S or Cmd+S)

### Step 3: Deploy as Web App

1. Click **Deploy** (top right)
2. Click **New deployment** (+ icon)
3. Select deployment type: **Web app**
4. Fill in:
   - Execute as: Your email address
   - Who has access: **Anyone**
5. Click **Deploy**
6. Copy the generated URL (looks like: `https://script.googleapis.com/macros/d/DEPLOYMENT_ID/userweb...`)

### Step 4: Test the Macros

**In Apps Script Editor:**
1. Select `testMacros` function from dropdown
2. Click ▶️ Run
3. Check Logs (View > Logs)

**Via URL (GET requests):**

```
GET your-deployment-url?action=getTrainerNames
```

Response:
```json
{
  "success": true,
  "message": "Trainer names retrieved successfully",
  "data": ["Coach John", "Coach Sarah", "Coach Mike"]
}
```

```
GET your-deployment-url?action=getActivityByTrainerAndDate&trainer=Coach%20John&date=2024-08-05
```

Response:
```json
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

## Using in Your Frontend

### Option 1: Fetch Trainer Names

```javascript
// In your React component
const GAS_URL = "https://your-deployment-url"; // From Step 3

async function getTrainers() {
  const response = await fetch(`${GAS_URL}?action=getTrainerNames`);
  const result = await response.json();
  return result.data; // ["Coach John", "Coach Sarah", ...]
}
```

### Option 2: Fetch Activity by Trainer and Date

```javascript
async function getActivity(trainerName, date) {
  const url = new URL(GAS_URL);
  url.searchParams.append("action", "getActivityByTrainerAndDate");
  url.searchParams.append("trainer", trainerName);
  url.searchParams.append("date", date);
  
  const response = await fetch(url.toString());
  const result = await response.json();
  return result.data; // Array of activities
}
```

### Option 3: POST Request

```javascript
async function getActivityViaPost(trainerName, date) {
  const response = await fetch(GAS_URL, {
    method: "POST",
    payload: JSON.stringify({
      action: "getActivityByTrainerAndDate",
      trainer: trainerName,
      date: date
    })
  });
  const result = await response.json();
  return result.data;
}
```

## Adding to Your Frontend

Update `frontend/src/components/ActivityForm.jsx` to use GAS:

```javascript
const GAS_URL = "https://your-deployment-url"; // Add to environment

// In useEffect, fetch trainers from GAS instead of backend
useEffect(() => {
  const fetchTrainers = async () => {
    try {
      const response = await fetch(`${GAS_URL}?action=getTrainerNames`);
      const result = await response.json();
      if (result.success) {
        setTrainers(result.data);
      }
    } catch (error) {
      console.error("Error fetching trainers:", error);
    }
  };
  
  fetchTrainers();
}, []);
```

## Create Environment Variable

Add to `frontend/.env`:

```
REACT_APP_GAS_URL=https://your-deployment-url
```

## API Reference

### Endpoint 1: Get Trainer Names

**URL:**
```
GET /macros/d/{DEPLOYMENT_ID}/userweb?action=getTrainerNames
```

**Response:**
```json
{
  "success": true,
  "message": "Trainer names retrieved successfully",
  "data": ["Name1", "Name2", "Name3"]
}
```

### Endpoint 2: Get Activity by Trainer and Date

**URL (GET):**
```
GET /macros/d/{DEPLOYMENT_ID}/userweb?action=getActivityByTrainerAndDate&trainer=CoachName&date=2024-08-05
```

**URL (POST):**
```
POST /macros/d/{DEPLOYMENT_ID}/userweb

Body:
{
  "action": "getActivityByTrainerAndDate",
  "trainer": "Coach Name",
  "date": "2024-08-05"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found 1 activity(ies) for Coach Name on 2024-08-05",
  "data": [
    {
      "activity": "Practice",
      "start": "10:30",
      "end": "11:30",
      "duration": "60",
      "note": "Optional note"
    }
  ]
}
```

## Response Format

All responses follow this format:

```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": null|array|object
}
```

### Success Example:
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [...]
}
```

### Error Example:
```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

## Updating the Code

If you need to modify the macros:

1. Go back to Apps Script editor
2. Make changes to `Code.gs`
3. Save (Ctrl+S)
4. **Important**: Redeploy to apply changes
   - Click Deploy > New deployment (creates new URL)
   - Or click Deploy > Manage Deployments > Edit existing

## Troubleshooting

### "Sheet not found" error
- Verify `SHEET_NAME` in Code.gs matches your sheet name
- Check it's exactly "Activities" or update line 10

### "Column not found" error
- Verify column headers match exactly:
  - "Trainer Name"
  - "Date"
  - "Activity"
  - "Start Time"
  - "End Time"
  - "Note"
- Update COLUMNS object if different

### Macro returns empty array
- Check data exists in sheet
- Verify date format (should be YYYY-MM-DD)
- Check trainer name spelling (case-sensitive)

### CORS errors
- Google Apps Script should allow CORS by default
- If issues persist, ensure "Who has access" is set to "Anyone"

### Deployment URL not working
- Redeploy with "Execute as: Your email"
- Set "Who has access: Anyone"
- Test URL in browser first

## Security Considerations

✅ **Public Access**: Anyone with the URL can call these macros
- This is intentional for frontend access
- Data returned is public (everyone can see trainer schedules)

✅ **No Authentication**: Google Apps Script handles this
- Sheet access is authenticated via Google account
- Users don't need credentials

⚠️ **To Restrict Access** (if needed):
- Change "Who has access" to "Me" (less secure)
- Implement your own API key system
- Use backend API instead (more control)

## Alternative: Use Your Backend API Instead

If you prefer to avoid exposing the GAS URL, update your backend to call it:

**In `backend/sheets.py`:**
```python
def get_trainers(self):
    # Current implementation reads from sheet
    # You could also call GAS endpoint
    gas_url = os.getenv('GAS_URL')
    # Make request to GAS URL
    # Return formatted response
```

## Testing Checklist

- [ ] Code.gs copied to Apps Script
- [ ] Code saved
- [ ] Deployed as Web app
- [ ] Deployment URL copied
- [ ] testMacros() runs without errors
- [ ] GET request to getTrainerNames works in browser
- [ ] GET request with trainer name and date works
- [ ] Response format is valid JSON

## Next Steps

1. Deploy the Google Apps Script (steps above)
2. Copy deployment URL
3. Add to frontend `.env` as `REACT_APP_GAS_URL`
4. Update frontend to fetch trainers from GAS
5. Update backend if desired (optional)

## Files

- `google-apps-script/Code.gs` - The complete Apps Script code
- This guide: `GOOGLE_APPS_SCRIPT_SETUP.md`

---

**Need help?** Check the troubleshooting section above or review the detailed comments in Code.gs
