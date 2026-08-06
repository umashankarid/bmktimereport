# Multi-Time Slots Feature Documentation

## Overview
Users can now log the **same activity multiple times with different time slots** on the same date. This is useful for activities that occur at different times during the day (e.g., Group Training 3-4pm AND 6-7pm).

## Feature Details

### User Interface

#### Adding Multiple Time Slots
1. Check the activity checkbox to select an activity
2. Enter the first time slot (Start Time, End Time)
3. Click "+ Add time slot" button to add another time slot for the same activity
4. Repeat as needed
5. Click "✕" on any time slot (except when only 1 exists) to remove it

#### Display Summary
- Selected activities show with all their time slots listed
- Example: "Group Training: 3:00-4:00, 6:00-7:00"
- Each slot appears as a separate row in the submission summary

#### Submission
- User can see all activities and their time slots before submitting
- On submit, one row is created per activity-per-time-slot in Google Sheets
- Example: Selecting Group Training for 2 time slots = 2 rows added to sheet

### Backend Integration

#### Multi-Activity Submission Format
The frontend sends data in this format:

```javascript
{
  trainer_name: "John Doe",
  date: "2024-01-15",
  note: "Regular training session",
  activities: [
    { activity: "Group Training", start_time: "15:00", end_time: "16:00" },
    { activity: "Group Training", start_time: "18:00", end_time: "19:00" },
    { activity: "Coaching", start_time: "20:00", end_time: "21:00" }
  ]
}
```

#### Backend Processing
The `sheets.add_activity()` method in `backend/sheets.py`:
- Accepts both single-activity and multi-activity formats (backwards compatible)
- Iterates through the `activities` array
- Creates one Google Sheet row per activity
- Returns count and list of logged activities

Example response:
```json
{
  "success": true,
  "message": "✓ Logged 3 activity/activities",
  "count": 3,
  "activities": ["Group Training", "Group Training", "Coaching"]
}
```

### State Management

#### ActivityForm Component State
```javascript
// selectedActivities structure:
{
  "Group Training": [
    { start_time: "15:00", end_time: "16:00" },
    { start_time: "18:00", end_time: "19:00" }
  ],
  "Coaching": [
    { start_time: "20:00", end_time: "21:00" }
  ]
}
```

#### State Functions
- `handleActivityToggle()`: Check/uncheck activity, initialize with one empty slot
- `handleAddTimeSlot()`: Add new time slot object to activity's array
- `handleRemoveTimeSlot()`: Remove specific time slot by index
- `handleTimeSlotChange()`: Update start/end time for specific slot

### UI Components

#### Time Slot Input Group
- Start/End time inputs
- Remove button (✕) - only shown when > 1 slot
- Add button (+ Add time slot) - shown on last slot only

#### CSS Classes
- `.activity-time-slots`: Container for all slots of an activity
- `.time-slot`: Individual slot container
- `.time-slot-inputs`: Flex container for inputs and buttons
- `.btn-add-slot`: Add slot button (blue)
- `.btn-remove-slot`: Remove slot button (red)

#### Responsive Design
- Desktop: 3-column grid for start/end/remove
- Mobile (≤768px): 2-column for start/end, remove spans both
- Buttons stack properly on smaller screens

### Validation

The form validates:
1. **At least one activity selected** - if no new activities, shows message
2. **All time slots complete** - each slot must have both start and end times
3. **All base fields present** - trainer, date required
4. **Time format** - uses HTML5 time input (HH:MM format)

### Example Workflows

#### Scenario 1: Multiple Time Slots Same Activity
```
Date: 2024-01-15
Activity: Group Training ✓
  Slot 1: 15:00 - 16:00
  + Add time slot
  Slot 2: 18:00 - 19:00

Submit → Creates 2 rows in Google Sheets
```

#### Scenario 2: Multiple Activities with Mixed Slots
```
Date: 2024-01-15
Activity: Group Training ✓
  Slot 1: 15:00 - 16:00
  Slot 2: 18:00 - 19:00
Activity: Coaching ✓
  Slot 1: 09:00 - 10:30

Submit → Creates 3 rows in Google Sheets
```

#### Scenario 3: Existing + New Activities
```
Today's Activities (existing):
- Warm-up: 12:00 - 12:30 [Edit] [Delete]
- Batting Practice: 13:00 - 14:00 [Edit] [Delete]

Add New Activities:
- Group Training ✓
  - Slot 1: 15:00 - 16:00
  - Slot 2: 18:00 - 19:00

Submit → Adds 2 new rows, existing activities unchanged
```

### Google Sheets Data Structure

When logging multiple slots of one activity:
```
| Trainer Name | Date       | Activity      | Start Time | End Time | Note       |
|--------------|------------|---------------|------------|----------|------------|
| John Doe     | 2024-01-15 | Group Training| 15:00      | 16:00    | Regular    |
| John Doe     | 2024-01-15 | Group Training| 18:00      | 19:00    | Regular    |
| John Doe     | 2024-01-15 | Coaching      | 09:00      | 10:30    | Regular    |
```

Each time slot is a **separate row** to maintain data integrity and enable independent reporting/filtering.

### Backwards Compatibility

The backend still supports single-activity format:
```javascript
// Legacy single-activity format still works:
{
  trainer_name: "John Doe",
  date: "2024-01-15",
  activity: "Group Training",
  start_time: "15:00",
  end_time: "16:00",
  note: "Regular"
}
```

### Feature Interaction with Other Components

#### Reports Page
- **Activity Summary**: Hours accumulate correctly (multiple slots of same activity add up)
- **Activity Distribution**: Each slot counts separately in the chart
- **Monthly Trends**: Works correctly with multi-slot entries
- CSV export includes all rows (one per slot)

#### Activity History
- Shows each time slot as a separate row (matches Google Sheets)
- Edit/delete operations work on individual slots
- Multiple slots of same activity appear as separate entries

#### Admin Dashboard
- Reports filter correctly when multiple slots exist
- Trainer dropdown works with multi-slot data
- Month/year filters apply to all slots

## Testing Checklist

- [x] Add single time slot for activity
- [x] Add multiple time slots for same activity
- [x] Remove time slot with ✕ button
- [x] Cannot remove last time slot directly (needs to uncheck activity)
- [x] Summary displays all slots before submit
- [x] Submit creates correct number of rows
- [x] Google Sheets receives all rows
- [x] Reports calculate correctly with multiple slots
- [x] Existing activities view unaffected
- [x] Mobile responsive layout
- [ ] Edge cases: Max number of slots
- [ ] Performance: Large number of slots

## Files Modified

### Frontend
- `frontend/src/components/ActivityForm.jsx`: Added time slot state and UI
- `frontend/src/styles/ActivityForm.css`: Added time slot styling

### Backend
- `backend/sheets.py`: Already supported multi-activity format (no changes needed)
- `backend/app.py`: Already passes through multi-activity data (no changes needed)

### No Changes Required
- `backend/auth.py`, `backend/trainer_auth.py`: Pass through data unchanged
- `frontend/src/pages/ReportsPage.jsx`: Handles multi-slot data correctly
- `frontend/src/components/ActivityList.jsx`: Shows individual rows as expected

## Future Enhancements

1. **Max Slots Limit**: Prevent user from adding 100+ time slots (UI bloat)
2. **Time Conflict Detection**: Warn if time slots overlap
3. **Activity Templates**: Pre-populate common multi-slot patterns
4. **Quick Copy**: Duplicate last time slot with one click
5. **Duration Presets**: Quick buttons for common durations (30m, 1h, 1.5h)
6. **Bulk Operations**: Edit all slots of an activity at once

## Known Limitations

- No server-side max limit on number of slots (frontend validation could be added)
- No timezone support (uses local time)
- No activity conflict warnings across different activities
- Cannot set different notes per slot (applies same note to all slots)
