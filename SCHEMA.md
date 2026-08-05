# Google Sheet Schema

## Columns (A to F)

| Column | Field Name | Data Type | Required | Example | Notes |
|--------|------------|-----------|----------|---------|-------|
| A | Trainer Name | Text | Yes | John Smith | Name of the coaching trainer |
| B | Date | Date | Yes | 2024-08-05 | YYYY-MM-DD format |
| C | Activity | Text | Yes | Practice | Type of activity (Practice, Drill, Match, etc.) |
| D | Start Time | Time | Yes | 10:30 | HH:MM format (24-hour) |
| E | End Time | Time | Yes | 11:30 | HH:MM format (24-hour) |
| F | Note | Text | No | Good session | Optional notes about the activity |

## Activity Types

- Practice
- Drill
- Match
- Tournament
- Conditioning
- Theory
- Other

## Example Data

| Trainer Name | Date | Activity | Start Time | End Time | Note |
|---|---|---|---|---|---|
| Coach John | 2024-08-05 | Practice | 10:30 | 11:30 | Great session, worked on backhand strokes |
| Coach Sarah | 2024-08-05 | Drill | 14:00 | 14:45 | Net drills for beginners |
| Coach Mike | 2024-08-06 | Match | 15:00 | 16:30 | Friendly match between A and B levels |

## Creating the Sheet

1. Open [Google Sheets](https://sheets.google.com)
2. Create new spreadsheet
3. Add these headers in row 1:
   - A1: `Trainer Name`
   - B1: `Date`
   - C1: `Activity`
   - D1: `Start Time`
   - E1: `End Time`
   - F1: `Note`

4. Share with service account email

## Frontend Form Fields

The web form matches these columns:

- **Date** - Date picker (YYYY-MM-DD)
- **Trainer Name** - Dropdown (or text input for new trainers)
- **Activity** - Dropdown selector
- **Start Time** - Time picker (HH:MM)
- **End Time** - Time picker (HH:MM)
- **Note** - Text area (optional)

## Data Flow

```
Form Input → Validation → Backend → Google Sheets API → Google Sheet
```

1. Trainer fills form with 6 fields
2. Backend validates all required fields
3. Sends row to Google Sheets
4. Data appears immediately in sheet
5. Frontend refreshes list to show new activity
