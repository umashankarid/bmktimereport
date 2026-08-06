# Multi-Activity Logging Feature

## Overview
The badminton app now supports logging multiple activities in a single submission with individual start/end times for each activity.

## How It Works

### 1. Activities Source
Activities are read from the **"All Activities"** sheet in Google Sheets:
- Sheet Name: `All Activities`
- Column Name: `Activities`
- Auto-created on first startup with 7 default activities

### 2. Frontend - Activity Form

#### UI Components
- **Checkboxes**: Each activity from the sheet appears as a checkbox
- **Time Inputs**: When a checkbox is selected, start/end time inputs appear below it
- **Summary**: Shows selected activities with their time ranges
- **Submit Button**: Disabled until at least one activity is selected with times

#### Workflow
1. User selects date
2. User checks one or more activities
3. For each selected activity, user enters start time and end time
4. User adds optional note (applies to all activities)
5. Clicks "Log Activities" button

### 3. Backend - Multi-Activity Submission

#### API Endpoint
- **POST** `/api/activities`
- Accepts single activity (legacy) or multiple activities (new format)

#### New Submission Format
```json
{
  "trainer_name": "Umashankar",
  "date": "2026-08-06",
  "note": "Great session",
  "activities": [
    {
      "activity": "Practice",
      "start_time": "09:00",
      "end_time": "10:30"
    },
    {
      "activity": "Drill",
      "start_time": "10:30",
      "end_time": "11:15"
    }
  ]
}
```

#### Database Recording
- Each activity is written as a **separate row** to the Activities sheet
- All rows have the same trainer name, date, and note
- Only the activity name and times differ per row

Example sheet output:
| Trainer Name | Date | Activity | Start Time | End Time | Note |
|---|---|---|---|---|---|
| Umashankar | 2026-08-06 | Practice | 09:00 | 10:30 | Great session |
| Umashankar | 2026-08-06 | Drill | 10:30 | 11:15 | Great session |

### 4. Sheet Initialization
On first run, the app automatically:
1. Creates "All Activities" sheet if missing
2. Adds header row with "Activities" column
3. Populates 7 default activities:
   - Practice
   - Drill
   - Match
   - Tournament
   - Conditioning
   - Theory
   - Other

You can edit these activities directly in the Google Sheet to customize them.

## API Endpoints

### Get Activity List
```
GET /api/activity-list
```
Returns list of activities from "All Activities" sheet.

Response:
```json
{
  "success": true,
  "data": ["Practice", "Drill", "Match", ...],
  "count": 7
}
```

### Submit Activities (Multi-Activity)
```
POST /api/activities
Content-Type: application/json
```

Request:
```json
{
  "trainer_name": "Umashankar",
  "date": "2026-08-06",
  "activities": [
    {
      "activity": "Practice",
      "start_time": "09:00",
      "end_time": "10:30"
    }
  ],
  "note": "Optional note"
}
```

Response:
```json
{
  "success": true,
  "message": "Logged 2 activity/activities: Practice, Drill",
  "count": 2,
  "activities": ["Practice", "Drill"]
}
```

## Customizing Activities

### Option 1: Edit in Google Sheets
1. Open your Google Sheet
2. Go to "All Activities" sheet
3. Edit or add activities in the "Activities" column (starting from row 2)

### Option 2: Manually Add Activities
Add rows to the "All Activities" sheet with activity names:
| Activities |
|---|
| Practice |
| Custom Activity |
| Another Activity |

## Demo Mode
In demo mode (no Google Sheets configured):
- Uses hardcoded default activities list
- Activities are stored in memory
- Not persisted between sessions

## Error Handling
- Validates all activities have both start and end times
- Shows user-friendly error messages
- Returns 400 if required fields missing
- Returns 500 for server errors with details

## Future Enhancements
- Bulk edit activities
- Activity categories/tags
- Activity templates with preset durations
- Time conflict validation
- Activity history/reporting
