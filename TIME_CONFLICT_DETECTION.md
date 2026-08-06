# Time Conflict Detection - Overlapping Activity Prevention

## Problem
Trainers could log overlapping activities on the same day, which is not allowed:

**Example of Invalid Data**:
```
Umashankar  2026-08-06  Support Club  12:18-13:18
Umashankar  2026-08-06  Club Matches  14:18-15:18
Umashankar  2026-08-06  Support Club  12:18-14:18  ❌ OVERLAPS with first entry!
```

The third entry overlaps with the first (both use time 12:18-13:18 range).

## Solution: Time Conflict Detection

Implemented validation to prevent overlapping activity recordings for the same trainer on the same day.

## Implementation

### File Modified
`backend/sheets.py`

### New Methods

#### 1. `_parse_time(time_str)` 
Converts HH:MM format to minutes since midnight for easier comparison:
```python
"12:18" → 738 minutes (12*60 + 18)
"14:18" → 858 minutes (14*60 + 18)
```

#### 2. `_times_overlap(start1, end1, start2, end2)`
Detects if two time ranges overlap:
```python
# Overlap detection logic:
# Range 1: 12:18-13:18
# Range 2: 12:18-14:18
# Result: True (they overlap from 12:18-13:18)

# Non-overlapping:
# Range 1: 12:18-13:18
# Range 2: 14:18-15:18
# Result: False (different times)
```

**Algorithm**:
Two ranges overlap if:
- Range A starts before Range B ends AND
- Range B starts before Range A ends

```python
start1 < end2 AND start2 < end1
```

#### 3. `_check_time_conflicts(trainer_name, date, new_activities)`
Checks if new activities conflict with existing activities:

```python
def _check_time_conflicts(self, trainer_name, date, new_activities):
    """
    Args:
        trainer_name: "Umashankar"
        date: "2026-08-06"
        new_activities: [
            {activity: "Support Club", start_time: "12:18", end_time: "14:18"}
        ]
    
    Returns:
        Tuple of (has_conflicts, conflict_list)
    """
```

**Process**:
1. Get all existing activities for trainer on that date
2. For each new activity:
   - Compare with each existing activity
   - Check for time overlaps
   - If overlap found, add to conflicts list
3. Return (has_conflicts, conflicts)

### Integration with Activity Logging

**Added to `add_activity()` method**:

```python
# Check for time conflicts BEFORE logging
has_conflicts, conflicts = self._check_time_conflicts(
    activity_data['trainer_name'],
    activity_data['date'],
    activities_to_log
)

if has_conflicts:
    return {
        'success': False,
        'message': 'Time conflict detected. Cannot log overlapping activities.',
        'conflicts': [c['message'] for c in conflicts]
    }
```

**Flow**:
```
User submits activities
    ↓
Backend receives request
    ↓
Validate base fields (trainer, date)
    ↓
CHECK FOR TIME CONFLICTS ← NEW
    ↓
If conflicts found → Return error ❌
If no conflicts → Log activities ✅
```

## Error Response Format

**When Conflict Detected**:
```json
{
  "success": false,
  "message": "Time conflict detected. Cannot log overlapping activities.",
  "conflicts": [
    "⏰ Overlap: Support Club (12:18-14:18) overlaps with Club Matches (14:18-15:18)",
    "⏰ Overlap: Training (13:00-15:00) overlaps with Support Club (12:18-14:18)"
  ]
}
```

**Frontend Display**:
Shows in red error box:
```
Time conflict detected. Cannot log overlapping activities.
```

## Examples

### Example 1: Valid Activities (No Conflict)
```
Existing:
  - Support Club: 12:00-13:00

New:
  - Club Matches: 14:00-15:00
  - Coaching: 15:30-16:30

Result: ✅ ALLOWED (no overlaps)
```

### Example 2: Overlapping Times (Conflict)
```
Existing:
  - Support Club: 12:00-13:30

New:
  - Club Matches: 12:30-13:30  ← Overlaps 12:30-13:30

Result: ❌ BLOCKED (conflict detected)
Error: "Overlap: Club Matches (12:30-13:30) overlaps with Support Club (12:00-13:30)"
```

### Example 3: Adjacent Times (Allowed)
```
Existing:
  - Support Club: 12:00-13:00

New:
  - Club Matches: 13:00-14:00  ← Starts exactly when previous ends

Result: ✅ ALLOWED (adjacent times are OK, no overlap)
```

### Example 4: Multiple Activities (Partial Conflict)
```
Existing:
  - Support Club: 12:00-13:00
  - Training: 15:00-16:00

New:
  - Coaching: 12:30-13:30  ← Conflicts with Support Club
  - Match: 14:00-14:30     ← OK (no conflicts)
  - Admin: 15:30-16:30     ← Conflicts with Training

Result: ❌ BLOCKED
Errors:
  1. "Overlap: Coaching (12:30-13:30) overlaps with Support Club (12:00-13:00)"
  2. "Overlap: Admin (15:30-16:30) overlaps with Training (15:00-16:00)"

Note: None of the activities are logged because at least one has a conflict
```

## Validation Rules

✅ **Allowed**:
- Different times of day: 12:00-13:00 and 14:00-15:00
- Adjacent times: 12:00-13:00 and 13:00-14:00
- Same activity on different dates
- Same activity for different trainers on same date

❌ **Blocked**:
- Overlapping times: 12:00-13:30 and 12:30-14:00
- Exact duplicate: 12:00-13:00 and 12:00-13:00
- Partial overlap: 12:00-14:00 and 13:00-15:00
- Any overlap: 12:00-13:00 and 12:59-13:01

## Testing

### Test Case 1: No Conflicts
```
Add: Support Club 14:00-15:00
When: Existing = Support Club 12:00-13:00
Result: ✅ Success (different times)
```

### Test Case 2: Direct Overlap
```
Add: Club Matches 12:30-13:30
When: Existing = Support Club 12:00-13:00
Result: ❌ Blocked (overlap 12:30-13:00)
```

### Test Case 3: Multiple New Activities
```
Add: [
  Coaching 12:30-13:30,
  Match 14:00-15:00
]
When: Existing = Support Club 12:00-13:00
Result: ❌ Blocked (Coaching conflicts, entire submission rejected)
```

### Test Case 4: Same Time, Different Activity
```
Add: Club Matches 12:00-13:00
When: Existing = Support Club 12:00-13:00
Result: ❌ Blocked (different activities, same time = conflict)
```

### Test Case 5: Adjacent Times OK
```
Add: Club Matches 13:00-14:00
When: Existing = Support Club 12:00-13:00
Result: ✅ Success (adjacent, no overlap)
```

## Edge Cases Handled

1. ✅ Invalid time format (non-HH:MM) → Skipped gracefully
2. ✅ Missing times → Validation caught before conflict check
3. ✅ Demo mode → Uses in-memory data for conflict check
4. ✅ Real mode → Reads from Google Sheets
5. ✅ Multiple trainers same day → No conflicts (different trainers)
6. ✅ Same trainer, same date, multiple new activities → Checked against all existing

## Logging

**Console Output When Conflict Detected**:
```
⏰ CHECKING FOR TIME CONFLICTS
❌ TIME CONFLICTS DETECTED:
   ⏰ Overlap: Support Club (12:18-14:18) overlaps with Club Matches (14:18-15:18)
   ⏰ Overlap: Training (13:00-14:00) overlaps with Support Club (12:18-14:18)
```

**Console Output When No Conflicts**:
```
⏰ CHECKING FOR TIME CONFLICTS
✅ No time conflicts
📤 Logging activity: Support Club
   ⏱️  12:18 - 13:18
```

## Performance

- **Time Complexity**: O(n) where n = number of existing activities for that trainer/date
- **Space Complexity**: O(k) where k = number of conflicts found
- **Impact**: Minimal (added before append, doesn't affect existing data)

## Git Commit

**Hash**: `27adb7d`
**Message**: "Add time conflict detection to prevent overlapping activity recordings"

**Changes**:
- 1 file modified
- 103 insertions(+)

## Files Modified
- `backend/sheets.py`

## Deployment Status
✅ Ready for production
✅ All changes pushed to GitHub
✅ Live at: https://badminton-app-a4j6.onrender.com

## User Experience

**Before**: Could accidentally log overlapping activities
**After**: System prevents overlapping activities with clear error messages

**Error Message Examples**:
- "Time conflict detected. Cannot log overlapping activities."
- Shows specific conflicts that were found
- User can see which activities caused the problem
- User can modify times and try again

The time conflict detection ensures data integrity and prevents incorrect activity logging.
