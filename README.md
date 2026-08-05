# Badminton Activity Logger

A web application for badminton trainers to log their coaching activities with data automatically stored in Google Sheets.

## Features

- **Easy Activity Logging** — Quick form to record coaching sessions
- **Google Sheets Storage** — All data saved directly to Google Sheets
- **Google Apps Script Macros** — Query your sheet data directly via API
- **Trainer Management** — Auto-populated trainer list from your sheet
- **Activity Types** — Support for different session types (Practice, Drill, Match, etc.)
- **Mobile-Friendly** — Responsive design for logging on phones/tablets
- **Real-Time Sync** — Immediate data sync to Google Sheets
- **Activity History** — View past logged activities with auto-calculated duration

## Tech Stack

### Backend
- Python 3.9+
- Flask
- Flask-CORS
- google-auth & gspread (Google Sheets API)
- python-dotenv

### Frontend
- React 18
- Axios
- Tailwind CSS
- Responsive design

## Project Structure

```
badminton-activity-logger/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── sheets.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── .env.example
└── README.md
```

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 16+
- Google Cloud Account
- Google Sheet for data storage

### Step 1: Google Cloud Setup

1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a Service Account
4. Download credentials JSON file
5. Share your Google Sheet with the service account email

### Step 2: Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add credentials JSON path and Sheet ID to .env
python app.py
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

## Google Sheet Setup

Your Google Sheet should have these columns:
- Trainer Name
- Date
- Activity
- Start Time
- End Time
- Note

## API Endpoints

- `POST /api/activities` — Log a new activity
- `GET /api/activities` — Get all logged activities
- `GET /api/trainers` — Get list of trainers

## Google Apps Script Integration

This project includes Google Apps Script macros for querying your sheet directly:

- **getTrainerNames()** — Get all unique trainer names
- **getActivityByTrainerAndDate(trainer, date)** — Get activities for a trainer on a date

See **GAS_INTEGRATION.md** for setup and usage.

## Deployment

- **Frontend**: Deploy to Vercel or Netlify
- **Backend**: Deploy to Render, Railway, or Heroku
- **Macros**: Deploy as Web App via Google Apps Script

## License

MIT
