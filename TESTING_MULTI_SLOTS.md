# Multi-Time Slots Feature - Testing Guide

## Test Environment
- **App URL**: https://badminton-app-a4j6.onrender.com
- **Login**: Use Google Sheets credentials (trainer account setup)
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

## Manual Test Scenarios

### Test 1: Single Time Slot (Baseline)
**Objective**: Verify basic functionality still works

**Steps**:
1. Log in as a trainer
2. Check an activity (e.g., "Group Training")
3. Enter start time: 15:00
4. Enter end time: 16:00
5. Click "Log Activity"
6. Verify: 1 row added to Google Sheets with correct times

**Expected Result**: ✅ PASS
- Activity logged successfully
- Google Sheets shows 1 new row
- Times displayed in HH:MM format

---

### Test 2: Add Second Time Slot
**Objective**: Verify ability to add multiple slots for same activity

**Steps**:
1. Log in as a trainer
2. Select date: today
3. Check an activity (e.g., "Group Training")
4. Enter Slot 1: 15:00 - 16:00
5. Click "+ Add time slot" button
6. Verify: New slot appears below with empty time inputs
7. Enter Slot 2: 18:00 - 19:00
8. Click "Log Activity"
9. Verify: 2 rows added to Google Sheets

**Expected Result**: ✅ PASS
- "+ Add time slot" button appears after Slot 1
- Slot 2 input fields appear
- Both slots submitted correctly
- Google Sheets shows 2 rows with same activity name

---

### Test 3: Remove Time Slot
**Objective**: Verify ability to remove unwanted time slots

**Steps**:
1. Log in as a trainer
2. Check an activity
3. Enter Slot 1: 15:00 - 16:00
4. Click "+ Add time slot"
5. Enter Slot 2: 18:00 - 19:00
6. Click "+ Add time slot"
7. Enter Slot 3: 20:00 - 21:00
8. Click "✕" button on Slot 2
9. Verify: Slot 2 is removed, Slots 1 & 3 remain
10. Submit form
11. Verify: Only 2 rows added (Slot 1 & 3)

**Expected Result**: ✅ PASS
- ✕ button only appears when > 1 slot
- Remove button works correctly
- Correct slots are removed
- Submission only includes remaining slots

---

### Test 4: Mixed Activities with Multiple Slots
**Objective**: Verify ability to log multiple activities with different slot counts

**Steps**:
1. Log in as a trainer
2. Date: today
3. Check "Group Training"
   - Slot 1: 15:00 - 16:00
   - Add slot → Slot 2: 18:00 - 19:00
4. Check "Coaching"
   - Slot 1: 09:00 - 10:30
5. Check "Warm-up"
   - Slot 1: 08:00 - 08:30
6. View summary: Should show 3 activities with 4 total slots
7. Submit
8. Verify: 4 rows added to Google Sheets

**Expected Result**: ✅ PASS
- Summary displays: "Group Training: 15:00-16:00, 18:00-19:00"
- Summary displays: "Coaching: 09:00-10:30"
- Summary displays: "Warm-up: 08:00-08:30"
- 4 rows created in Google Sheets

---

### Test 5: Validation - Missing Times
**Objective**: Verify form validates all slots have times

**Steps**:
1. Log in as a trainer
2. Check "Group Training"
3. Enter Slot 1: 15:00 - 16:00
4. Click "+ Add time slot"
5. Leave Slot 2 start/end times empty
6. Click "Log Activity"
7. Verify: Error message appears

**Expected Result**: ✅ PASS
- Error message: "Please set start and end times for all time slots of Group Training"
- Form does not submit
- No rows added to Google Sheets

---

### Test 6: Summary Display
**Objective**: Verify summary shows all selected activities and slots

**Steps**:
1. Log in as a trainer
2. Check "Group Training"
   - Slot 1: 15:00 - 16:00
   - Add slot → Slot 2: 18:00 - 19:00
3. Check "Coaching"
   - Slot 1: 09:00 - 10:30
4. Look for "New Activities" summary section
5. Verify all slots display

**Expected Result**: ✅ PASS
- Summary header shows: "New Activities (2):" (2 different activities)
- Summary lists:
  - "Group Training: 15:00-16:00, 18:00-19:00"
  - "Coaching: 09:00-10:30"

---

### Test 7: Mobile Responsive Design
**Objective**: Verify UI works correctly on mobile

**Steps**:
1. Open app on mobile device (or use browser DevTools F12 → Toggle Device Toolbar)
2. Set viewport to iPhone (375px width)
3. Select activity and add multiple slots
4. Verify time inputs are usable
5. Verify buttons are clickable
6. Test remove button behavior on small screen
7. Submit form

**Expected Result**: ✅ PASS
- Time inputs stack vertically
- Remove button (✕) is accessible
- Add button (+ Add time slot) is full width
- All text is readable
- Form submits successfully

---

### Test 8: Existing Activities + New Slots
**Objective**: Verify existing activities aren't affected when adding new slots

**Steps**:
1. Create an activity on date X (e.g., "Warm-up: 08:00-08:30")
2. Log in on same date
3. Note: "Today's Activities" section shows existing activity
4. Select new activity "Group Training"
5. Add 2 time slots: 15:00-16:00 and 18:00-19:00
6. Submit
7. Verify: Existing activity unchanged, 2 new rows added

**Expected Result**: ✅ PASS
- Existing activities visible in editable cards
- New slots don't interfere with existing
- Submission adds only new rows
- Total activities on date = 1 existing + 2 new

---

### Test 9: Long Activity Name
**Objective**: Verify UI handles long activity names

**Steps**:
1. (Admin) Add custom activity: "Very Long Group Training Session Name"
2. Log in as trainer
3. Check the long-named activity
4. Add 2 time slots
5. Submit
6. Verify layout isn't broken

**Expected Result**: ✅ PASS
- Activity name displays clearly
- Doesn't break layout
- Time slots align properly
- All text wraps appropriately

---

### Test 10: Rapid Slot Addition
**Objective**: Verify no issues with rapid clicking

**Steps**:
1. Check activity
2. Rapidly click "+ Add time slot" 5-10 times
3. Verify: All slots render without errors
4. Fill in times for a few slots
5. Submit

**Expected Result**: ✅ PASS
- All slots render (no console errors)
- Remove buttons work for each slot
- Submission includes all filled slots
- No state corruption

---

### Test 11: Reports Calculation
**Objective**: Verify reports handle multiple slots correctly

**Steps**:
1. Log "Group Training" for 3 time slots:
   - 09:00 - 10:00 (1 hour)
   - 14:00 - 15:30 (1.5 hours)
   - 18:00 - 19:30 (1.5 hours)
   - Total: 4 hours
2. Navigate to Reports
3. View "Activity Summary" for today
4. Verify hours calculated: 4:00

**Expected Result**: ✅ PASS
- Activity Summary shows: "Group Training: 4:00"
- Monthly total includes all 4 hours
- Quota tracking reflects 4 hours used

---

### Test 12: CSV Export
**Objective**: Verify exported CSV includes all time slots

**Steps**:
1. Log activities with multiple slots (as in Test 11)
2. Go to Reports
3. Click "Download CSV"
4. Open CSV in spreadsheet app
5. Verify: Multiple rows for same activity

**Expected Result**: ✅ PASS
- CSV has 3 rows for Group Training
- Each row has correct start/end times
- All columns populated correctly

---

### Test 13: Activity History View
**Objective**: Verify Activity History shows individual slots

**Steps**:
1. Log "Group Training" for 2 time slots (as in Test 11)
2. Log "Coaching" for 1 time slot
3. Navigate to Activity History (in trainer dashboard)
4. Verify: Shows 3 individual rows (one per slot)

**Expected Result**: ✅ PASS
- Activity History table shows 3 rows
- Each row is editable independently
- Can delete individual slots
- Timestamps and times are correct

---

### Test 14: Admin Reports Filtering
**Objective**: Verify admin reports work with multi-slot data

**Steps**:
1. (As trainer) Log multiple activities with multiple slots
2. (As admin) Go to Admin Dashboard → Reports
3. Select trainer from dropdown
4. Select current month
5. View reports (Summary, Distribution, Trends)
6. Verify calculations are correct

**Expected Result**: ✅ PASS
- Trainer dropdown filters correctly
- All slots are counted in totals
- Hours are summed correctly
- Distribution chart includes all slots
- Monthly trends accurate

---

## Automated Test Considerations

While no automated tests are currently in the project, these could be added:

### Unit Tests
- `handleAddTimeSlot()`: Verify array grows correctly
- `handleRemoveTimeSlot()`: Verify array shrinks, activity removed if empty
- `handleTimeSlotChange()`: Verify correct slot updated
- Submission logic: Verify flattening creates correct structure

### Integration Tests
- Multi-slot submission → Google Sheets receives all rows
- Reports calculate correctly from multi-slot data
- Activity History displays all slots

### E2E Tests (Cypress/Playwright)
- Complete user journey: Select activity → Add slots → Submit → Verify Google Sheets
- Remove slot → Submit → Verify count correct
- Mobile responsive layout

## Expected Data Structure

### Submission Payload
```javascript
{
  trainer_name: "John Doe",
  date: "2024-01-15",
  note: "Regular training",
  activities: [
    { activity: "Group Training", start_time: "15:00", end_time: "16:00" },
    { activity: "Group Training", start_time: "18:00", end_time: "19:00" },
    { activity: "Coaching", start_time: "09:00", end_time: "10:30" }
  ]
}
```

### Google Sheets Output
```
| Trainer Name | Date       | Activity      | Start Time | End Time | Note           |
|--------------|------------|---------------|------------|----------|----------------|
| John Doe     | 2024-01-15 | Group Training| 15:00      | 16:00    | Regular training|
| John Doe     | 2024-01-15 | Group Training| 18:00      | 19:00    | Regular training|
| John Doe     | 2024-01-15 | Coaching      | 09:00      | 10:30    | Regular training|
```

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Performance Considerations

- Currently no limit on number of slots (could add 100+ slots)
- Recommendation: Warn if > 10 slots per activity
- Recommendation: Limit to 20 total slots per submission

## Edge Cases to Monitor

1. **Empty slot removal**: User adds slot but doesn't fill → Remove button appears → Click remove → Works?
2. **Time format edge cases**: 00:00, 23:59, backwards times (18:00 - 15:00)?
3. **Timezone issues**: Are times stored in user's timezone or UTC?
4. **Large submissions**: What if user adds 50+ time slots?
5. **Network failure**: What if submission fails mid-way?

## Success Criteria

✅ Feature is SUCCESSFUL if:
1. Users can add multiple time slots for same activity
2. Each slot creates separate row in Google Sheets
3. All slots counted correctly in reports
4. UI is responsive on mobile
5. No errors in browser console
6. Form validation prevents incomplete submissions
7. Backend handles multi-slot submissions without errors

## Deployment Verification

After deployment to Render:
1. Check app at https://badminton-app-a4j6.onrender.com
2. Perform Test 1 (baseline)
3. Perform Test 2 (multiple slots)
4. Monitor browser console for errors
5. Check Google Sheets for data

## Notes

- All times are in HH:MM format (24-hour)
- Times are stored in user's local timezone
- No automatic validation for time conflicts
- Note applies to all slots of an activity (not per-slot notes)
