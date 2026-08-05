# Setup Guide - Badminton Activity Logger

## Prerequisites

- Python 3.9+
- Node.js 16+ and npm
- Google Account with Google Cloud Project access
- Git

## Step 1: Google Cloud Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create Project**
3. Name it "Badminton Activity Logger"
4. Click **Create**

### 1.2 Enable Google Sheets API

1. In the Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Sheets API"
3. Click on it and press **Enable**

### 1.3 Create Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the service account details:
   - Service account name: `badminton-logger`
   - Click **Create and Continue**
4. Grant the following roles:
   - **Editor** (for simplicity, or just **Spreadsheet Editor** if available)
5. Click **Continue** and then **Done**

### 1.4 Create and Download Service Account Key

1. On the **Credentials** page, find your service account under **Service Accounts**
2. Click on it to open details
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create** - the JSON file will download automatically
7. **Save this file securely** - you'll need it for the backend

### 1.5 Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "Badminton Activities"
3. Add headers in the first row:
   - A1: Trainer Name
   - B1: Date
   - C1: Activity
   - D1: Start Time
   - E1: End Time
   - F1: Note

4. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
5. **Share the sheet with your service account email** (found in the JSON key file)

---

## Step 2: Backend Setup

### 2.1 Clone/Setup Project

```bash
cd badminton-activity-logger/backend
```

### 2.2 Create Python Virtual Environment

```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 2.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in:
   ```
   FLASK_ENV=development
   SECRET_KEY=your-random-secret-key-here
   GOOGLE_CREDENTIALS_PATH=credentials.json
   GOOGLE_SHEET_ID=your-sheet-id-here
   CORS_ORIGINS=http://localhost:3000,http://localhost:5000
   PORT=5000
   ```

3. Copy your Google Service Account JSON key file to the backend directory:
   ```bash
   # From your Downloads folder
   cp ~/Downloads/your-project-12345-key.json ./credentials.json
   ```

### 2.5 Run Backend

```bash
python app.py
```

You should see:
```
✓ Authenticated with Google Sheets API
 * Running on http://0.0.0.0:5000
```

### 2.6 Test Backend

```bash
# Health check
curl http://localhost:5000/api/health

# You should see:
# {"status":"healthy","service":"badminton-activity-logger","version":"1.0.0"}
```

---

## Step 3: Frontend Setup

### 3.1 Install Dependencies

```bash
cd ../frontend
npm install
```

### 3.2 Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

### 3.3 Start Frontend

```bash
npm start
```

The app will open at `http://localhost:3000`

---

## Step 4: Test the Application

1. Go to `http://localhost:3000` in your browser
2. Click "Log Activity"
3. Fill in the form:
   - Date: (auto-filled with today)
   - Trainer Name: "Coach John" (or any name)
   - Activity Type: "Practice"
   - Duration: 60
   - Court: "Court 1"
   - Participants: 8
   - Notes: "Great session!"
4. Click "Log Activity"
5. Go to "Activity History" tab
6. You should see your logged activity

7. **Check Google Sheets**: Open your Google Sheet - the data should be there!

---

## Troubleshooting

### Issue: "Credentials file not found"

**Solution**: Make sure `credentials.json` is in the `backend/` directory

### Issue: "Permission denied accessing sheet"

**Solution**: 
1. Open your Google Sheet
2. Click Share
3. Add the service account email (from your credentials JSON)
4. Grant "Editor" access

### Issue: "CORS error" in browser console

**Solution**: Make sure backend is running on port 5000 and `CORS_ORIGINS` in `.env` includes your frontend URL

### Issue: Can't see data in Google Sheet

**Solution**: 
1. Check that the sheet name is exactly "Activities"
2. Verify the service account has edit permissions
3. Check backend logs for errors

---

## Deployment

### Deploy Backend

**Option 1: Render**

1. Push code to GitHub
2. Go to [Render](https://render.com)
3. New > Web Service
4. Connect GitHub repository
5. Set environment variables (same as `.env`)
6. Deploy

**Option 2: Railway**

1. Push code to GitHub
2. Go to [Railway](https://railway.app)
3. New Project > Import from GitHub
4. Set environment variables
5. Deploy

**Option 3: Heroku (free tier ended)**

Use Render or Railway instead.

### Deploy Frontend

**Option 1: Vercel**

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import Project > Select GitHub repo
4. In Environment Variables:
   ```
   REACT_APP_API_URL=https://your-backend-url.com/api
   ```
5. Deploy

**Option 2: Netlify**

1. Push code to GitHub
2. Go to [Netlify](https://netlify.com)
3. New site from Git
4. Build command: `npm run build`
5. Publish directory: `build`
6. Deploy

---

## Environment Variables Reference

### Backend (.env)

```
FLASK_ENV=development                    # development or production
SECRET_KEY=your-secret-key              # Random string for session security
GOOGLE_CREDENTIALS_PATH=credentials.json # Path to Google service account JSON
GOOGLE_SHEET_ID=xxxxx                   # Your Google Sheet ID
CORS_ORIGINS=http://localhost:3000      # Comma-separated allowed origins
PORT=5000                               # Port for backend server
```

### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5000/api  # Backend API URL
```

---

## Next Steps

- Add user authentication
- Add data analytics/charts
- Mobile app version
- Export to Excel/CSV
- Multi-sheet support for different clubs
