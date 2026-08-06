# Activity Viewing and Editing Feature

## Overview
Trainers can now view all activities logged for a specific date, edit existing activities, and add new ones in a single interface.

## Features Implemented

### 1. Automatic Activity Fetching
- When a date is selected, the app automatically fetches all activities for that trainer on that date
- Activities load in the "Today's Activities" section
- Loading indicator shows while fetching

### 2. Existing Activities Display
- Shows each existing activity in an editable card
- Displays activity name, current start time, and end time
- Green-themed cards to distinguish from new activities

### 3. Inline Activity Editing
**For each existing activity:**
- Start Time input field (editable)
- End Time input field (editable)
- Save button (💾) to persist changes
- Delete button (🗑️) to remove activity

**Editing Workflow:**
1. Select a date
2. Find the activity you want to edit in "Today's Activities"
3. Modify the start/end times
4. Click "Save" to update the Google Sheet
5. Success confirmation appears

### 4. New Activities
- Separate section for adding new activities
- Checkboxes for available activities (from "All Activities" sheet)
- Time inputs appear when checkbox is selected
- Log new activities alongside edited ones

### 5. Unified Form
- One form handles both viewing/editing existing AND adding new activities
- Trainer information pre-filled
- Date selector at top
- Note field (applies to new activities)

## API Endpoints

### Get Activities for a Date
```
GET /api/activities/<trainer_name>/<date>
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "Trainer Name": "Umashankar",
      "Date": "2026-08-06",
      "Activity": "Practice",
      "Start Time": "09:00",
      "End Time": "10:30",
      "Note": "Good session",
      "_row_number": 2
    }
  ],
  "count": 1
}
```

### Update an Activity
```
PUT /api/activities/<trainer_name>/<date>/<activity_name>
Content-Type: application/json
```

Request Body:
```json
{
  "start_time": "09:15",
  "end_time": "10:45",
  "note": "Updated note"
}
```

Response:
```json
{
  "success": true,
  "message": "Activity updated: Practice",
  "data": {
    "trainer_name": "Umashankar",
    "date": "2026-08-06",
    "activity": "Practice",
    "start_time": "09:15",
    "end_time": "10:45",
    "note": "Updated note"
  }
}
```

## User Interface

### Existing Activities Section (Green)
- **Title:** "📝 Today's Activities (N)"
- Shows count of existing activities
- Each card displays:
  - Activity name (bold, green color)
  - Delete button (top right)
  - Start/End time edit fields
  - Save button

### New Activities Section (Gray)
- **Title:** "Add New Activities"
- Checkboxes for available activities
- Time inputs appear when selected
- Summary of selected new activities

### Form Actions
- **Save Button (💾):** Updates existing activity times
- **Delete Button (🗑️):** Removes activity from list
- **Log Activities Button:** Submits new activities

## UI States

### Loading
- Shows "Loading activities..." during initial load
- Shows "Loading existing activities..." while fetching for a date

### No Existing Activities
- Existing activities section doesn't appear if date has no activities
- Shows only "Add New Activities" section

### Success/Error Messages
- Green alert for successful updates: "✓ Updated Practice"
- Red alert for errors with description
- Auto-dismisses after 3-5 seconds

## Workflow Examples

### Scenario 1: Edit Existing Activity
1. Login as trainer
2. Select a date (auto-fetches activities)
3. Find "Practice" in "Today's Activities"
4. Change start time from 09:00 to 09:15
5. Click "Save"
6. Google Sheet updated immediately
7. Success message appears

### Scenario 2: Add New Activity
1. Select a date
2. Check "Drill" checkbox
3. Enter start time: 10:30, end time: 11:15
4. Click "Log New Activity"
5. New row added to Google Sheet
6. Page refreshes, shows both existing and new activities

### Scenario 3: Edit + Add in Same Session
1. Select date (shows existing activities)
2. Edit "Practice" times → Save
3. Check "Match" checkbox
4. Enter times: 14:00 - 15:30
5. Click "Log 1 New Activity"
6. Both changes synced to Sheet

## Technical Details

### Backend Changes
- `get_activities_by_trainer_and_date()`: Fetches activities with row numbers
- `update_activity()`: Updates specific activity's times using `update_cell()`
- Row tracking: Stores `_row_number` for accurate sheet updates

### Frontend Changes
- Auto-fetch on date change using `useEffect`
- Separate state for `selectedActivities` (new) and `editingActivities` (existing)
- Split handling: updates vs. submissions
- Service calls with proper URL encoding for special characters

### Data Flow
```
User selects date
  ↓
Auto-fetch existing activities
  ↓
Display in editable cards
  ↓
User edits times + clicks Save
  ↓
PUT /api/activities/<trainer>/<date>/<activity>
  ↓
Backend updates Google Sheet cell
  ↓
Success message + refresh list
```

## Demo Mode
- Existing activities stored in memory
- Updates happen in memory only
- Not persisted between sessions
- Shows "DEMO MODE" in responses

## Error Handling
- Validates times are present before saving
- Displays error message if update fails
- Continues working if one activity fails
- Proper error responses from backend

## Next Steps (Optional)
- Bulk edit multiple activities at once
- Time conflict detection
- Activity duration validation
- Export activities to PDF
- Activity analytics/reporting
- Recurring activities
