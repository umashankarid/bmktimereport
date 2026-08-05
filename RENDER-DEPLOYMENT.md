# Deploy to Render

This guide helps you deploy the Badminton Activity Logger to Render.

## Prerequisites

1. **GitHub Account** - Push your code to GitHub
2. **Render Account** - Sign up at https://render.com
3. **Google Cloud Credentials** - Your service account JSON file
4. **Google Sheet** - Your sheet ID

## Step 1: Push to GitHub

```bash
cd /local/repo/badminton-activity-logger
git init
git add .
git commit -m "Initial commit: Badminton Activity Logger"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/badminton-activity-logger.git
git push -u origin main
```

## Step 2: Create Render Web Service (Backend)

1. Go to https://render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `badminton-backend`
   - **Runtime**: `Docker`
   - **Build Command**: (leave empty - uses Dockerfile)
   - **Start Command**: (leave empty - uses CMD in Dockerfile)
   - **Port**: `5000`
5. Add Environment Variables:
   - `FLASK_ENV`: `production`
   - `SECRET_KEY`: Generate a secure key (use `python -c "import secrets; print(secrets.token_hex(32))"`)
   - `GOOGLE_SHEET_ID`: Your sheet ID
   - `GOOGLE_CREDENTIALS_PATH`: `/app/credentials.json`
   - `CORS_ORIGINS`: `https://badminton-frontend.onrender.com`

6. Under "Advanced":
   - Add File: `/app/credentials.json`
   - Paste your Google Cloud credentials JSON content

7. Click **Create Web Service**

## Step 3: Create Render Web Service (Frontend)

1. Go to https://render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository (same one)
4. Configure:
   - **Name**: `badminton-frontend`
   - **Runtime**: `Docker`
   - **Root Directory**: `frontend/` (optional)
   - **Port**: `3000`
5. Add Environment Variables:
   - `REACT_APP_API_URL`: `https://badminton-backend.onrender.com/api`

6. Click **Create Web Service**

## Step 4: Test the Deployment

Once both services are deployed:

1. Go to your frontend URL (shown on Render dashboard)
2. Login with: `admin` / `password123`
3. Try logging an activity

If Google Sheets connectivity works on Render, data will sync to your sheet.

## Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify credentials.json is properly set
- Ensure `GOOGLE_SHEET_ID` is correct

### Frontend can't reach backend
- Check `REACT_APP_API_URL` environment variable
- Verify it matches your backend URL exactly

### Google Sheets times out
- Same network issue as local - may need to share sheet again
- Try updating Google Cloud credentials

## Environment Variables Reference

```
Backend:
- FLASK_ENV: production
- SECRET_KEY: (generate with: python -c "import secrets; print(secrets.token_hex(32))")
- GOOGLE_SHEET_ID: 1Kn2zxibNy2omm00YEZDmLnnanruqkfcv2UeU7TK35KU
- GOOGLE_CREDENTIALS_PATH: /app/credentials.json
- CORS_ORIGINS: https://badminton-frontend.onrender.com

Frontend:
- REACT_APP_API_URL: https://badminton-backend.onrender.com/api
```

## Updating the App

After deployment, just push changes to GitHub:

```bash
git add .
git commit -m "Update features"
git push origin main
```

Render will automatically redeploy!

## Production Checklist

- [ ] Generate secure SECRET_KEY
- [ ] Update CORS_ORIGINS for frontend domain
- [ ] Set REACT_APP_API_URL to backend domain
- [ ] Upload credentials.json to Render
- [ ] Test login (admin/password123)
- [ ] Test activity logging
- [ ] Verify Google Sheets sync (if network allows)
