# 🔐 Admin Login - Quick Start

## No More Manual Setup!

Now you can login to your admin account and configure Google Sheets directly in the app.

## Default Demo Credentials

```
Username: admin
Password: password123
```

## How to Use

### Step 1: Start the Servers

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

### Step 2: Open the App

Open http://localhost:3000 in your browser

You'll see the **Login Page** automatically

### Step 3: Login

1. Enter Username: `admin`
2. Enter Password: `password123`
3. Click "Login"

### Step 4: Setup Google Sheets

After login, you'll see the **Setup Page**:

1. **Enter your Google Sheet ID**
   - Find it in your Google Sheet URL
   - Example: `docs.google.com/spreadsheets/d/1a2b3c4d5e6f/edit`
   - Your ID: `1a2b3c4d5e6f`

2. **Upload credentials JSON**
   - Click "Choose File"
   - Select your Google Cloud service account JSON file
   - (Download from Google Cloud Console)

3. **Click "Complete Setup"**

### Step 5: Use the App!

After setup:
- You'll be redirected to the main app
- Start logging activities
- Data goes directly to your Google Sheet

## What's New

✅ **Admin Login** - Secure authentication
✅ **Setup in UI** - No more manual configuration
✅ **Protected App** - Only authenticated admins can use
✅ **Session Management** - Auto logout on browser close

## Key Features

- **Easy Login** - Simple username/password form
- **File Upload** - Upload credentials directly
- **Auto Redirect** - Goes to setup if not configured
- **Logout Button** - In top right of main app
- **Demo Account** - Use to test without Google setup

## Files Changed

**Backend:**
- Added `auth.py` - Authentication logic
- Updated `app.py` - Added auth routes
- Updated `requirements.txt` - Added PyJWT

**Frontend:**
- Added `services/authService.js` - Auth service
- Added `pages/LoginPage.jsx` - Login page
- Added `pages/SetupPage.jsx` - Setup page
- Updated `App.jsx` - Auth state management
- New CSS files for login/setup styling

## Security Notes

- Demo credentials are for development only
- Change them for production
- Store credentials securely in environment variables
- Tokens expire after 24 hours
- All requests require authentication

## Default Flow

```
Open App
  ↓
Check if authenticated?
  ↓
NO → Show Login Page
  ↓
Enter credentials
  ↓
YES, but configured?
  ↓
NO → Show Setup Page
  ↓
Enter Sheet ID + Upload JSON
  ↓
YES → Show Activity Logger
  ↓
Log activities! 🎉
```

## API Endpoints

All authentication happens automatically through the app:

- `POST /api/auth/login` - Login
- `POST /api/auth/setup-sheets` - Configure Google Sheets
- `GET /api/auth/setup-status` - Check if configured
- `POST /api/auth/logout` - Logout (optional)

## Testing Without Google Sheets

**Login Only Mode** (no Google Sheets):
1. Login with demo credentials
2. Don't complete setup
3. Backend API still works but won't save to Google Sheets

This is great for testing the UI!

## Next Steps

1. ✅ Start servers
2. ✅ Open http://localhost:3000
3. ✅ Login with demo credentials
4. ✅ Setup with your Google Sheet ID + credentials
5. ✅ Start logging activities!

---

**Remember:**
- Username: `admin`
- Password: `password123`

See `AUTHENTICATION.md` for full details.
