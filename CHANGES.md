# Changes Made to Match Your Google Sheet Schema

## Overview

Updated the entire application to match your actual Google Sheet columns:
- **Trainer Name** (was in middle, now first)
- **Date** 
- **Activity** (was "Activity Type" with duration/court, now just activity type)
- **Start Time** (new - was calculated as duration)
- **End Time** (new - was calculated as duration)
- **Note** (was "Notes")

## Backend Changes

### `backend/sheets.py`

**Column Header Update:**
```python
# OLD:
HEADERS = ['Date', 'Trainer Name', 'Activity Type', 'Duration (min)', 'Court', 'Participants', 'Notes']

# NEW:
HEADERS = ['Trainer Name', 'Date', 'Activity', 'Start Time', 'End Time', 'Note']
```

**Data Mapping:**
```python
# OLD: 7 columns including duration, court, participants
# NEW: 6 columns with explicit start/end times

row = [
    activity_data['trainer_name'],      # Column A
    activity_data['date'],               # Column B
    activity_data['activity'],           # Column C
    activity_data['start_time'],         # Column D
    activity_data['end_time'],           # Column E
    activity_data.get('note', '')        # Column F
]
```

**Validation:**
- Required fields: `trainer_name`, `date`, `activity`, `start_time`, `end_time`
- Optional field: `note`

## Frontend Changes

### `frontend/src/components/ActivityForm.jsx`

**Form Fields (Updated):**
```javascript
// OLD: 7 fields
date, trainer_name, activity_type, duration, court, participants, notes

// NEW: 6 fields
date, trainer_name, activity, start_time, end_time, note
```

**Form Structure:**
1. Date (date input)
2. Trainer Name (dropdown or text)
3. Activity (dropdown selector)
4. Start Time (time input) ← NEW
5. End Time (time input) ← NEW
6. Note (textarea)

### `frontend/src/components/ActivityList.jsx`

**Table Columns:**
```javascript
// OLD:
Date | Trainer | Activity Type | Duration | Court | Participants | Notes

// NEW:
Date | Trainer Name | Activity | Start Time | End Time | Duration (calculated) | Note
```

**Duration Calculation:**
The app now calculates duration from start/end times:
```javascript
calculateDuration(startTime, endTime) {
  // Converts "10:30" to "11:30" → displays as "60 min"
}
```

## Data Validation

### Required Fields (all must be filled):
- ✅ Trainer Name
- ✅ Date
- ✅ Activity
- ✅ Start Time
- ✅ End Time

### Optional Fields:
- Note (can be empty)

## Example Data

**Before:** 
```
Date: 2024-08-05
Trainer: John
Activity Type: Practice
Duration: 60
Court: Court 1
Participants: 8
Notes: Good session
```

**After:**
```
Trainer Name: John
Date: 2024-08-05
Activity: Practice
Start Time: 10:30
End Time: 11:30
Note: Good session
```

## Google Sheet Setup

Update your sheet headers:

| Column | OLD | NEW |
|--------|-----|-----|
| A | Date | Trainer Name |
| B | Trainer Name | Date |
| C | Activity Type | Activity |
| D | Duration (min) | Start Time |
| E | Court | End Time |
| F | Participants | Note |
| G | Notes | (removed) |

## API Endpoint

The endpoint remains the same:

```
POST /api/activities
{
  "trainer_name": "John Smith",
  "date": "2024-08-05",
  "activity": "Practice",
  "start_time": "10:30",
  "end_time": "11:30",
  "note": "Great session"
}
```

## Testing the Changes

1. Update your Google Sheet headers first
2. Redeploy backend
3. Redeploy frontend
4. Log in to the app
5. Fill the form with new structure
6. Submit and verify it appears in Google Sheet with correct columns

## Files Modified

✅ `backend/sheets.py` - Column mapping and validation
✅ `frontend/src/components/ActivityForm.jsx` - Form fields
✅ `frontend/src/components/ActivityList.jsx` - Table columns
✅ `frontend/src/styles/ActivityList.css` - CSS updates
✅ `README.md` - Schema documentation
✅ `SETUP.md` - Setup guide
✅ New: `SCHEMA.md` - Detailed schema reference
