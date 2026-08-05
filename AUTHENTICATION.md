# Authentication & Google Sheets Setup

## Overview

The application now includes a secure admin login system that allows users to configure their Google Sheets connection without manual setup.

## Flow

```
1. User opens app
   ↓
2. Redirected to Login page
   ↓
3. Enter admin credentials
   ↓
4. Redirected to Setup page
   ↓
5. Upload credentials.json + Google Sheet ID
   ↓
6. Connected to Google Sheets
   ↓
7. Activity Logger ready to use
```

## Admin Credentials

**Default Demo Credentials:**
- Username: `admin`
- Password: `password123`

⚠️ **For Production**: Update credentials in `backend/auth.py` or move to database

## Pages & Components

### 1. Login Page (`LoginPage.jsx`)

**Location**: `/frontend/src/pages/LoginPage.jsx`

**Features:**
- Username and password input
- Show/hide password toggle
- Error messages
- Submit button

**Usage:**
```
GET / → Shows LoginPage if not authenticated
POST /api/auth/login → Authenticates admin
```

### 2. Setup Page (`SetupPage.jsx`)

**Location**: `/frontend/src/pages/SetupPage.jsx`

**Features:**
- Google Sheet ID input field
- Credentials JSON file upload
- Setup instructions
- Validation checklist

**Usage:**
```
GET / → Shows SetupPage if logged in but not configured
POST /api/auth/setup-sheets → Configures Google Sheets
```

### 3. Main App (Updated `App.jsx`)

**Features:**
- Auth state management
- Automatic redirect based on auth status
- Logout functionality
- Admin username display in header

## Backend Endpoints

### POST /api/auth/login

Login with credentials

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLC...",
  "admin": {
    "username": "admin"
  }
}
```

### POST /api/auth/setup-sheets

Configure Google Sheets connection

**Required:**
- Authorization header with token: `Authorization: Bearer {token}`
- Form data:
  - `sheet_id`: Google Sheet ID
  - `credentials`: Service account JSON file

**Response:**
```json
{
  "success": true,
  "message": "Google Sheets connection configured successfully"
}
```

### GET /api/auth/setup-status

Check if Google Sheets is configured

**Required:**
- Authorization header: `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "configured": true,
  "sheet_id": "1a2b3c4d..."
}
```

### POST /api/auth/logout

Logout (optional, handled on client)

**Required:**
- Authorization header

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Authentication Flow

### Step 1: Login

```javascript
// User enters credentials
await authService.login('admin', 'password123');

// Returns:
// {
//   success: true,
//   admin: { username: 'admin' },
//   token: 'JWT_TOKEN'
// }

// Token stored in localStorage
// All future requests include Authorization header
```

### Step 2: Setup Google Sheets

```javascript
// User selects Google Sheet ID and credentials file
await authService.setupGoogleSheets(sheetId, credentialsFile);

// Backend:
// 1. Validates credentials JSON
// 2. Saves to backend/credentials.json
// 3. Updates environment variables
// 4. Reinitializes sheets manager
// 5. Returns success
```

### Step 3: Ready to Use

```javascript
// App checks setup status
const status = await authService.checkSetupStatus();

if (status.configured) {
  // Show main activity logger
} else {
  // Show setup page
}
```

## Security Features

✅ **JWT Token Authentication**
- Tokens expire after 24 hours
- Included in Authorization header
- Validated on backend

✅ **Protected Routes**
- Setup endpoint requires authentication
- Protected activities require authentication
- Token verification decorator

✅ **Secure File Upload**
- Validates JSON file format
- Checks for service account type
- Saves credentials securely

✅ **CORS Protection**
- Only allowed origins can access API
- Configurable in CORS_ORIGINS env var

## Development vs Production

### Development (Current)

- Demo credentials: `admin` / `password123`
- Credentials stored in `backend/credentials.json`
- Token expires in 24 hours
- No database needed

### Production Setup

1. **Update Admin Credentials**
   ```python
   # In backend/auth.py
   ADMIN_CREDENTIALS = {
       'newadmin': 'securepassword123'
   }
   ```

2. **Use Database for Credentials**
   ```python
   # Example: SQLite with hashed passwords
   import hashlib
   
   # Hash passwords before storing
   hashed = hashlib.sha256(password.encode()).hexdigest()
   ```

3. **Store Credentials Securely**
   - Use environment variables for sensitive data
   - Don't commit credentials.json to git
   - Add to `.gitignore` (already done)

4. **Use HTTPS**
   - Deploy on HTTPS only
   - Secure cookies
   - Secure token transmission

## Files Added/Modified

### New Files

1. **Backend**
   - `backend/auth.py` - Authentication routes and utilities

2. **Frontend**
   - `frontend/src/services/authService.js` - Authentication service
   - `frontend/src/pages/LoginPage.jsx` - Login component
   - `frontend/src/pages/SetupPage.jsx` - Setup component
   - `frontend/src/styles/LoginPage.css` - Login styles
   - `frontend/src/styles/SetupPage.css` - Setup styles

### Modified Files

1. **Backend**
   - `backend/app.py` - Added auth route registration
   - `backend/requirements.txt` - Added PyJWT dependency

2. **Frontend**
   - `frontend/src/App.jsx` - Added auth state management
   - `frontend/src/App.css` - Added header auth styling

## Testing Login

### Local Testing

1. **Start backend:**
   ```bash
   cd backend
   python app.py
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Login with demo credentials:**
   - Username: `admin`
   - Password: `password123`

4. **Setup Google Sheets:**
   - Enter your Google Sheet ID
   - Upload service account JSON file
   - Click "Complete Setup"

### API Testing

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'

# Get token from response
TOKEN="eyJ0eXAiOiJKV1QiLC..."

# Check setup status
curl -X GET http://localhost:5000/api/auth/setup-status \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### "Invalid username or password"
- Check credentials match ADMIN_CREDENTIALS in auth.py
- Username and password are case-sensitive

### "Token expired"
- Token expires after 24 hours
- User needs to log out and log in again

### "Invalid service account JSON"
- File must be from Google Cloud Service Account
- Check `type` field is `service_account`
- Verify JSON is valid

### "Sheet not found"
- Verify Google Sheet ID is correct
- Check sheet is shared with service account email
- Verify sheet has correct headers

## Next Steps

1. Test login with demo credentials
2. Generate Google Cloud service account
3. Create Google Sheet with proper headers
4. Upload credentials and sheet ID
5. Start logging activities!

## For Production

See: [PRODUCTION_AUTHENTICATION.md](./PRODUCTION_AUTHENTICATION.md) (create this for your deployment)

---

**Start by logging in with**: `admin` / `password123`
