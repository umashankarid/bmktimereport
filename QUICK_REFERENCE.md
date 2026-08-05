# Quick Reference Guide

## 30-Second Overview

**You wanted**: A website for badminton trainers to log activities → Google Sheets
**You got**: A complete web app with form → Google Sheets integration ✅

## Your Google Sheet Columns

```
A: Trainer Name  |  B: Date  |  C: Activity  |  D: Start Time  |  E: End Time  |  F: Note
```

## The Form (What trainers will fill)

```
┌─────────────────────────────────────┐
│  📝 Log New Activity                │
├─────────────────────────────────────┤
│  Date: [today] ✓                    │
│  Trainer Name: [dropdown/text] ✓    │
│  Activity: [Practice/Drill...] ✓    │
│  Start Time: [10:30] ✓              │
│  End Time: [11:30] ✓                │
│  Note: [optional text]              │
│                                     │
│              [Log Activity] ➜ Save  │
└─────────────────────────────────────┘
```

## The History View

```
┌────────────────────────────────────────────────────┐
│  📋 Activity History                    [🔄 Refresh]│
├────────────────────────────────────────────────────┤
│ Date      │Trainer    │Activity   │Start │End │Dur│
├────────────────────────────────────────────────────┤
│ 2024-08-05│John Smith │Practice   │10:30 │... │60m│
│ 2024-08-05│Sarah Lee  │Drill      │14:00 │... │45m│
└────────────────────────────────────────────────────┘
```

## Setup in 3 Steps

### Step 1: Google Cloud (15 min)
1. Create service account
2. Download credentials.json
3. Create Google Sheet
4. Share with service account

### Step 2: Backend (5 min)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py  # Runs on :5000
```

### Step 3: Frontend (5 min)
```bash
cd frontend
npm install
npm start  # Opens :3000
```

## Files You Need to Create

| File | Location | Content |
|------|----------|---------|
| `credentials.json` | `backend/` | Google Service Account JSON (download from Google Cloud) |
| `.env` | `backend/` | Copy from `.env.example`, add your credentials |
| `.env` | `frontend/` | Copy from `.env.example`, update API URL |

## Environment Variables

**Backend (.env)**
```
GOOGLE_CREDENTIALS_PATH=credentials.json
GOOGLE_SHEET_ID=your-sheet-id-from-url
CORS_ORIGINS=http://localhost:3000
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Testing Your Setup

```bash
# 1. Test backend health
curl http://localhost:5000/api/health
# Should return: {"status":"healthy",...}

# 2. Log an activity via API
curl -X POST http://localhost:5000/api/activities \
  -H "Content-Type: application/json" \
  -d '{"trainer_name":"Test","date":"2024-08-05","activity":"Practice","start_time":"10:00","end_time":"11:00","note":"Test"}'

# 3. Check your Google Sheet - row should appear!

# 4. Open http://localhost:3000 and verify in UI
```

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `credentials.json not found` | Copy JSON to `backend/` |
| `GOOGLE_SHEET_ID not set` | Add to `.env` |
| `CORS error in browser` | Check `CORS_ORIGINS` in `.env` |
| `Sheet not found` | Verify sheet exists and is shared |
| `401 Unauthorized` | Check credentials.json is valid |

## API Endpoints

```
GET  /api/health                    # Health check
POST /api/activities                # Log activity
GET  /api/activities?limit=50      # Get history
GET  /api/trainers                  # Get all trainers
```

## Folder Structure

```
backend/
  ├── app.py (Flask app)
  ├── sheets.py (Google Sheets code)
  ├── config.py (Configuration)
  ├── requirements.txt
  ├── .env (YOUR CREDENTIALS HERE)
  └── credentials.json (YOUR GOOGLE KEY HERE)

frontend/
  ├── src/
  │   ├── App.jsx (Main component)
  │   ├── components/
  │   │   ├── ActivityForm.jsx (Form)
  │   │   └── ActivityList.jsx (History)
  │   └── ...
  └── package.json
```

## Deployment Checklist

- [ ] Backend running locally? ✓
- [ ] Frontend running locally? ✓
- [ ] Data appearing in Google Sheet? ✓
- [ ] All verifications passed? ✓
- [ ] Ready to push to GitHub? ✓

**Then deploy to:**
- Backend: Render or Railway
- Frontend: Vercel or Netlify

## Key Commands

```bash
# Backend
python3 -m venv venv              # Create virtual env
source venv/bin/activate          # Activate it
pip install -r requirements.txt   # Install packages
python app.py                      # Run server

# Frontend
npm install                        # Install packages
npm start                          # Run dev server
npm run build                      # Build for production
npm test                           # Run tests

# Both together
npm run dev                        # If using npm workspaces
```

## Form Validation

All of these are **REQUIRED**:
- ✅ Trainer Name (can't be empty)
- ✅ Date (must be valid date)
- ✅ Activity (must select one)
- ✅ Start Time (must be HH:MM)
- ✅ End Time (must be HH:MM)

This is **OPTIONAL**:
- ❌ Note (can be empty)

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Frontend)                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ActivityForm.jsx                                   │  │
│  │ [Shows form with 6 fields]                        │  │
│  │ User fills form → Click "Log Activity"            │  │
│  └──────────────────┬─────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │ POST /api/activities (JSON)
                      ▼
┌──────────────────────────────────────────────────────────┐
│                   Backend (Flask)                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ app.py: POST /api/activities                      │  │
│  │ 1. Validate all required fields                   │  │
│  │ 2. Call sheets.add_activity()                     │  │
│  └──────────────────┬─────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              sheets.py (Google Integration)              │
│  1. Authenticate with credentials.json                  │
│  2. Format row: [Name, Date, Activity, StartT, EndT, N] │
│  3. Append to Google Sheet                              │
│  4. Return success                                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────┐
        │   Your Google Sheet     │
        │  [New row appears!]     │
        └─────────────────────────┘

Frontend receives response → Shows success message
ActivityList component refreshes → Shows new entry
```

## Feature Summary

| Feature | Status |
|---------|--------|
| Log activities | ✅ |
| Save to Google Sheets | ✅ |
| View history | ✅ |
| Auto-calculate duration | ✅ |
| Trainer dropdown | ✅ |
| Form validation | ✅ |
| Error messages | ✅ |
| Mobile responsive | ✅ |
| Time picker | ✅ |
| Date picker | ✅ |

## Production Checklist

- [ ] Backend deployed to Render/Railway
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Updated CORS_ORIGINS with frontend URL
- [ ] Tested full flow in production
- [ ] Set up monitoring
- [ ] Created backups of credentials
- [ ] Documented deployment URLs
- [ ] Added error logging

---

**Need more details?** See the full documentation files in the project.
