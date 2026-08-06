# Reports Feature Documentation

## Overview
The Badminton Activity Logger now includes a comprehensive Reports section with 5 different report types to analyze activity data, training hours, trends, and more. Users can also export all data to CSV format.

## Report Types

### 1. 📋 Activity Summary by Trainer
**Purpose:** Get an overview of each trainer's activities

**Shows:**
- Trainer name
- Total number of activities logged
- Total training hours
- Number of active days (days with at least one activity)
- Breakdown of activity types

**Use Case:** Quick overview of trainer performance and engagement

**Example Output:**
```
Umashankar
├── Total Activities: 12
├── Total Hours: 28.5h
├── Active Days: 8
└── Activity Types:
    ├── Practice: 6
    ├── Drill: 4
    └── Match: 2
```

---

### 2. 📈 Activity Types Distribution
**Purpose:** Understand which types of activities are most popular

**Shows:**
- Activity type name
- Count of activities
- Percentage distribution (visual bar chart)
- Total hours spent on each type
- Number of unique trainers involved

**Use Case:** Identify the most common activities, training focus areas

**Example Output:**
```
Practice - 45% (18 activities)
├── Count: 18
├── Hours: 28.5
└── Trainers: 3

Drill - 30% (12 activities)
├── Count: 12
├── Hours: 15.0
└── Trainers: 2

Match - 25% (10 activities)
├── Count: 10
├── Hours: 20.0
└── Trainers: 2
```

---

### 3. ⏱️ Training Hours Report
**Purpose:** Track total training time by trainer

**Shows:**
- Trainer name
- Total training hours
- Total number of sessions
- Average hours per session

**Summary Statistics:**
- Total hours across all trainers
- Total sessions across all trainers
- Average hours per trainer

**Use Case:** Monitor training intensity, identify trainers needing more/less load

**Example Output:**
```
SUMMARY:
├── Total Hours: 63.5h
├── Total Sessions: 40
└── Avg Hours/Trainer: 21.2h

BY TRAINER:
Umashankar: 28.5h (12 sessions, avg 2.4h)
Coach B: 20.0h (15 sessions, avg 1.3h)
Coach C: 15.0h (13 sessions, avg 1.2h)
```

---

### 4. 📅 Monthly Activity Trends
**Purpose:** Track activity patterns over months

**Shows:**
- Month (YYYY-MM format)
- Total activities for the month
- Total training hours for the month
- Breakdown by activity type

**Use Case:** Identify seasonal patterns, training emphasis changes, growth trends

**Example Output:**
```
2026-08 (August)
├── Total Activities: 25
├── Total Hours: 50.0h
└── By Type:
    ├── Practice: 12 (20.0h)
    ├── Drill: 8 (15.0h)
    └── Match: 5 (15.0h)

2026-07 (July)
├── Total Activities: 18
├── Total Hours: 35.0h
└── By Type:
    ├── Practice: 10 (18.0h)
    ├── Drill: 5 (10.0h)
    └── Match: 3 (7.0h)
```

---

### 5. 📥 Export to CSV
**Purpose:** Download all activity data in CSV format for external analysis

**Exports:**
- Trainer Name
- Date
- Activity
- Start Time
- End Time
- Note

**Use Case:** Import to Excel, Google Sheets, or other analysis tools

**File Format:**
```csv
Trainer Name,Date,Activity,Start Time,End Time,Note
Umashankar,2026-08-06,Practice,09:00,10:30,Good session
Umashankar,2026-08-06,Drill,10:30,11:15,Focused on footwork
Coach B,2026-08-06,Match,14:00,15:30,
```

---

## User Interface

### Navigation
- Left sidebar with report type buttons
- Active report highlighted in blue
- Sticky navigation (stays visible while scrolling)

### Report Display Area
- Dynamic content based on selected report type
- Responsive grid/card/table layouts
- Visual indicators (badges, progress bars, stats boxes)

### Export Button
- Located at the bottom of reports section
- Downloads CSV file with timestamp

## Features

### Visual Design
- Color-coded activity badges (Practice, Drill, Match, Tournament, etc.)
- Gradient backgrounds for visual appeal
- Responsive card-based layouts
- Progress bars for distribution data
- Statistics boxes with metrics

### Interactivity
- Click report type to switch views
- Loading indicators while fetching data
- Error messages if report fails
- Smooth transitions between reports

### Responsiveness
- Desktop: 2-column layout (nav + content)
- Tablet: 1-column layout, horizontal nav
- Mobile: Stacked layout, simplified display

## API Endpoints

### 1. Activity Summary
```
GET /api/reports/activity-summary
```
Response:
```json
{
  "success": true,
  "data": {
    "Umashankar": {
      "total_activities": 12,
      "total_hours": 28.5,
      "activity_types": {
        "Practice": 6,
        "Drill": 4,
        "Match": 2
      },
      "active_days": 8
    }
  },
  "timestamp": "2026-08-06T12:30:00"
}
```

### 2. Activity Distribution
```
GET /api/reports/activity-distribution
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "activity_type": "Practice",
      "count": 18,
      "hours": 28.5,
      "unique_trainers": 3,
      "percentage": 45.0
    }
  ],
  "total_activities": 40,
  "timestamp": "2026-08-06T12:30:00"
}
```

### 3. Training Hours
```
GET /api/reports/training-hours
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "trainer": "Umashankar",
      "total_hours": 28.5,
      "total_sessions": 12,
      "avg_session_hours": 2.38
    }
  ],
  "summary": {
    "total_hours": 63.5,
    "total_sessions": 40,
    "avg_hours_per_trainer": 21.17
  },
  "timestamp": "2026-08-06T12:30:00"
}
```

### 4. Monthly Trends
```
GET /api/reports/monthly-trends
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "month": "2026-08",
      "total_count": 25,
      "total_hours": 50.0,
      "activities": [
        {
          "activity_type": "Practice",
          "count": 12,
          "hours": 20.0
        }
      ]
    }
  ],
  "timestamp": "2026-08-06T12:30:00"
}
```

### 5. Export CSV
```
GET /api/reports/export-csv
```
Response: CSV file download
```
Content-Type: text/csv
Content-Disposition: attachment; filename="activities_20260806_123000.csv"
```

## Performance Considerations

- All reports calculated from full activity dataset
- Results cached during session
- Re-fetch on demand via UI buttons
- CSV export streams data (no memory issues with large datasets)

## Demo Mode

- All reports work in demo mode
- Data stored in-memory
- Resets on browser refresh
- Useful for testing without Google Sheets

## Future Enhancements

- Custom date range filtering
- Trainer-specific filtering
- Email report delivery
- PDF export with formatting
- Real-time dashboard
- Activity goal tracking
- Performance metrics
- Comparison analysis (trainer vs trainer)
- Anomaly detection

## Troubleshooting

### Report Shows "No Data"
- Ensure activities have been logged
- Check that dates are in YYYY-MM-DD format
- Verify activity names match the "All Activities" sheet

### CSV Export Not Working
- Check browser download settings
- Verify sufficient activities exist
- Try exporting from a different browser

### Missing Report Types
- Ensure backend is running (check server logs)
- Verify all API endpoints are accessible
- Check browser console for network errors

## Access Control

Currently, all trainers can view reports with all trainer data.

**Future Enhancement:** Filter reports to show only current trainer's data when requested.

## Data Privacy

- All data calculated server-side
- No sensitive data in client-side state
- CSV export contains all activity data (handle responsibly)
