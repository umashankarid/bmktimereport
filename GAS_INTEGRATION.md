# Google Apps Script Integration Guide

## What You Got

Two powerful macros that let your website query your Google Sheet directly:

### Macro 1: `getTrainerNames()`
Returns all unique trainer names from your sheet as a JSON array.

**Use Case**: Populate the trainer dropdown in your form automatically

### Macro 2: `getActivityByTrainerAndDate(trainerName, date)`
Returns all activities for a specific trainer on a specific date.

**Use Case**: Look up what a trainer did on a specific day

## Complete Setup

### Part 1: Deploy Google Apps Script (10 min)

#### Step 1: Open Apps Script
1. Open your Google Sheet
2. Click **Extensions** (top menu)
3. Click **Apps Script**

#### Step 2: Copy Code
1. Delete the default `Code.gs`
2. Open: `/badminton-activity-logger/google-apps-script/Code.gs`
3. Copy ALL content
4. Paste into Apps Script editor
5. **Save** (Ctrl+S)

#### Step 3: Deploy as Web App
1. Click **Deploy** (top right)
2. Click **+ New deployment**
3. Deployment type: **Web app**
4. Execute as: **Your Email**
5. Who has access: **Anyone**
6. Click **Deploy**
7. **Copy the URL** shown (looks like: `https://script.googleapis.com/macros/d/...`)

#### Step 4: Test in Browser
Paste this in your browser (with YOUR URL):
```
https://script.googleapis.com/macros/d/YOUR_ID/userweb?action=getTrainerNames
```

You should see:
```json
{
  "success": true,
  "message": "Trainer names retrieved successfully",
  "data": ["Coach1", "Coach2", "Coach3"]
}
```

### Part 2: Use in Frontend (5 min)

#### Option A: Automatic (Recommended)

1. Add to `frontend/.env`:
   ```
   REACT_APP_GAS_URL=https://script.googleapis.com/macros/d/YOUR_ID/userweb
   ```

2. Replace current `ActivityForm.jsx` with `ActivityForm-WithGAS.jsx`:
   ```bash
   cp frontend/src/components/ActivityForm-WithGAS.jsx frontend/src/components/ActivityForm.jsx
   ```

3. Restart frontend: `npm start`

Now the trainer dropdown will populate automatically from your Google Sheet!

#### Option B: Manual Integration

Use the `getTrainerNames()` fetch in your component:

```javascript
useEffect(() => {
  const fetchTrainers = async () => {
    const response = await fetch(
      `${process.env.REACT_APP_GAS_URL}?action=getTrainerNames`
    );
    const result = await response.json();
    setTrainers(result.data);
  };
  
  fetchTrainers();
}, []);
```

### Part 3: Use in Backend (Optional)

You can also call Google Apps Script from your Python backend:

```python
# In backend/sheets.py

import requests

GAS_URL = os.getenv('GAS_URL')

def get_trainers_from_gas():
    """Get trainers from Google Apps Script"""
    try:
        response = requests.get(
            f"{GAS_URL}?action=getTrainerNames",
            timeout=10
        )
        result = response.json()
        if result['success']:
            return result['data']
        return []
    except Exception as e:
        print(f"Error calling GAS: {e}")
        return []
```

Then add to `.env`:
```
GAS_URL=https://script.googleapis.com/macros/d/YOUR_ID/userweb
```

## API Reference

### Endpoint 1: Get Trainer Names

**Method**: GET or POST

**URL**:
```
https://script.googleapis.com/macros/d/DEPLOYMENT_ID/userweb?action=getTrainerNames
```

**Response**:
```json
{
  "success": true,
  "message": "Trainer names retrieved successfully",
  "data": [
    "Coach John",
    "Coach Sarah",
    "Coach Mike"
  ]
}
```

### Endpoint 2: Get Activity by Trainer and Date

**Method**: GET or POST

**GET URL**:
```
https://script.googleapis.com/macros/d/DEPLOYMENT_ID/userweb?action=getActivityByTrainerAndDate&trainer=Coach%20John&date=2024-08-05
```

**POST Body**:
```json
{
  "action": "getActivityByTrainerAndDate",
  "trainer": "Coach John",
  "date": "2024-08-05"
}
```

**Response**:
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

## Code Examples

### Example 1: Fetch Trainers in React

```javascript
import { useEffect, useState } from 'react';

function TrainerSelector() {
  const [trainers, setTrainers] = useState([]);
  const GAS_URL = process.env.REACT_APP_GAS_URL;

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const response = await fetch(
          `${GAS_URL}?action=getTrainerNames`
        );
        const result = await response.json();
        if (result.success) {
          setTrainers(result.data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    if (GAS_URL) {
      fetchTrainers();
    }
  }, [GAS_URL]);

  return (
    <select>
      <option>Select trainer</option>
      {trainers.map(trainer => (
        <option key={trainer}>{trainer}</option>
      ))}
    </select>
  );
}

export default TrainerSelector;
```

### Example 2: Look Up Activity

```javascript
async function lookupActivity(trainerName, date) {
  const GAS_URL = process.env.REACT_APP_GAS_URL;
  
  const response = await fetch(
    `${GAS_URL}?action=getActivityByTrainerAndDate&trainer=${encodeURIComponent(trainerName)}&date=${date}`
  );
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`${trainerName} on ${date}:`, result.data);
    // result.data = [{ activity, start, end, duration, note }]
  } else {
    console.log('No activities found');
  }
}

// Usage
lookupActivity('Coach John', '2024-08-05');
```

### Example 3: Python Backend Request

```python
import requests

def get_trainers_via_gas(gas_url):
    """Fetch trainers from Google Apps Script"""
    try:
        response = requests.get(
            f"{gas_url}?action=getTrainerNames",
            timeout=10
        )
        data = response.json()
        
        if data['success']:
            return {
                'success': True,
                'data': data['data']
            }
        else:
            return {
                'success': False,
                'error': data['message']
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
```

## When to Use GAS vs Backend API

### Use Google Apps Script If:
✅ You want direct Google Sheet access
✅ You need simple read-only queries
✅ You want to avoid backend API calls
✅ You're prototyping quickly
✅ Data is public (no authentication needed)

### Use Backend API If:
✅ You need write operations (logging activities)
✅ You need authentication/authorization
✅ You're doing complex business logic
✅ You want centralized logging
✅ You need data validation

### Best Practice:
**Use both!**
- **Backend API**: Write operations (POST /api/activities)
- **Google Apps Script**: Read operations (get trainers, lookup activities)

## Architecture Diagram

```
┌─────────────────────────────────────┐
│         React Frontend              │
│  (http://localhost:3000)            │
└─────────────┬───────────────────────┘
              │
        ┌─────┴──────┐
        │             │
        ▼             ▼
   ┌──────────┐  ┌──────────────────┐
   │ Backend  │  │ Google Apps      │
   │ Flask    │  │ Script (GAS)     │
   │ API      │  │                  │
   │          │  │ - getTrainers()  │
   │ POST     │  │ - getActivity()  │
   │ /api/... │  │                  │
   └────┬─────┘  └────────┬─────────┘
        │                 │
        └─────────┬───────┘
                  │
                  ▼
        ┌──────────────────┐
        │  Your Google     │
        │  Sheet           │
        │                  │
        │ Trainer Name     │
        │ Date             │
        │ Activity         │
        │ Start Time       │
        │ End Time         │
        │ Note             │
        └──────────────────┘
```

## Troubleshooting

### Q: GAS URL not working
**A**: 
1. Check you copied full URL including `d/...` part
2. Verify deployment is "Anyone" can access
3. Test URL in browser first
4. Check spelling: `action=getTrainerNames`

### Q: Getting empty trainer list
**A**:
1. Check sheet has data (not empty)
2. Verify column header is exactly "Trainer Name"
3. Run testMacros() in Apps Script editor
4. Check sheet name is "Activities"

### Q: Getting "Script error" in response
**A**:
1. Go to Apps Script > Logs to see error details
2. Check column names match exactly
3. Verify sheet exists and has data
4. Check date format is YYYY-MM-DD

### Q: CORS errors in browser console
**A**:
1. Google Apps Script handles CORS automatically
2. Should work without additional configuration
3. If issues persist, check deployment settings
4. Try testing URL in browser first

## Files Reference

- `google-apps-script/Code.gs` - The Google Apps Script code
- `frontend/src/components/ActivityForm-WithGAS.jsx` - Updated form using GAS
- `GOOGLE_APPS_SCRIPT_SETUP.md` - Detailed deployment guide

## Next Steps

1. ✅ Deploy Google Apps Script (Part 1 above)
2. ✅ Copy deployment URL
3. ✅ Add to .env file
4. ✅ Update frontend (use ActivityForm-WithGAS.jsx)
5. ✅ Test it works

Your trainers will now auto-populate from your Google Sheet!

---

**Questions?** See `GOOGLE_APPS_SCRIPT_SETUP.md` for detailed deployment steps.
