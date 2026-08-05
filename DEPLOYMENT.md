# Deployment Guide - Badminton Activity Logger

## Quick Start Deployment Checklist

- [ ] Backend credentials set up
- [ ] Frontend environment variables configured
- [ ] Backend deployed to Render/Railway
- [ ] Frontend deployed to Vercel/Netlify
- [ ] APIs connected and tested

---

## Backend Deployment

### Render (Recommended - Free Tier Available)

1. **Prepare Backend**
   ```bash
   # Add Procfile to backend directory
   web: gunicorn app:app
   ```

2. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Create Web Service**
   - Click "New +" > "Web Service"
   - Connect your GitHub repository
   - Select branch: `main`

4. **Configure Service**
   - Name: `badminton-activity-logger-api`
   - Runtime: `Python 3`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && gunicorn app:app`

5. **Add Environment Variables**
   - `FLASK_ENV`: `production`
   - `SECRET_KEY`: (generate a random string)
   - `GOOGLE_CREDENTIALS_PATH`: `credentials.json`
   - `GOOGLE_SHEET_ID`: (your sheet ID)
   - `CORS_ORIGINS`: `https://your-frontend-domain.com`

6. **Upload Credentials**
   - In Render dashboard, go to Files section
   - Upload your `credentials.json` file
   - Or paste contents as environment variable (base64 encoded)

7. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Note the backend URL (e.g., `https://badminton-activity-logger-api.onrender.com`)

### Railway

1. **Setup**
   - Go to [railway.app](https://railway.app)
   - Create new project
   - Import from GitHub

2. **Configure**
   - Select `backend` directory
   - Add same environment variables as above

3. **Deploy**
   - Railway auto-deploys on Git push
   - Copy the generated URL

---

## Frontend Deployment

### Vercel (Recommended - Easiest)

1. **Prepare Frontend**
   ```bash
   # Create vercel.json in frontend directory
   {
     "buildCommand": "npm run build",
     "outputDirectory": "build"
   }
   ```

2. **Deploy**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Select `frontend` directory (under "Root Directory")

3. **Configure Environment**
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add:
     ```
     REACT_APP_API_URL=https://your-backend-url.com/api
     ```

4. **Deploy**
   - Vercel auto-deploys on Git push
   - Get your frontend URL (e.g., `https://badminton-logger.vercel.app`)

### Netlify

1. **Deploy**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `frontend/build` folder, OR
   - Connect GitHub repository

2. **Configure Build**
   - Build command: `npm run build`
   - Publish directory: `build`

3. **Environment Variables**
   - Settings > Build & Deploy > Environment
   - Add: `REACT_APP_API_URL=https://your-backend-url.com/api`

4. **Deploy**
   - Click Deploy
   - Get your frontend URL

---

## Update CORS Origins

After deploying, update your backend's `CORS_ORIGINS`:

1. Get your frontend URL (e.g., `https://badminton-logger.vercel.app`)
2. Update backend environment variable:
   ```
   CORS_ORIGINS=https://badminton-logger.vercel.app
   ```
3. Redeploy backend

---

## Production Checklist

### Backend
- [ ] `FLASK_ENV=production`
- [ ] Unique `SECRET_KEY` set
- [ ] `DEBUG=False`
- [ ] Credentials file secured
- [ ] CORS origins restricted to frontend domain
- [ ] Database backups configured
- [ ] Error logging enabled
- [ ] Health checks working

### Frontend
- [ ] Build optimized (`npm run build`)
- [ ] Environment variables set correctly
- [ ] API URL points to production backend
- [ ] Error boundaries in place
- [ ] Analytics/monitoring configured

---

## Monitoring & Maintenance

### Backend Logs

**Render**
- Dashboard > Service > Logs tab

**Railway**
- Dashboard > Logs tab

### Frontend Monitoring

**Vercel**
- Deployments tab
- Analytics tab

**Netlify**
- Deploys tab
- Site analytics

### Health Checks

Monitor endpoint: `https://your-backend-url.com/api/health`

Create uptime monitor:
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- Set to check every 5 minutes

---

## Scaling Considerations

As usage grows:

1. **Database**: Move from Google Sheets to PostgreSQL
2. **Caching**: Add Redis for frequently accessed data
3. **CDN**: Use CloudFlare for frontend distribution
4. **Authentication**: Add user login system
5. **Load Balancing**: Distribute traffic across multiple backend instances

---

## Cost Estimate

### Free Tier (Recommended for MVP)

- **Render Web Service**: Free (limited resources)
- **Vercel Frontend**: Free
- **Google Sheets**: Free
- **Total**: $0/month

### Production Tier

- **Render Web Service**: ~$7-12/month
- **Vercel Pro**: $20/month (optional)
- **Google Sheets**: Free
- **Domain**: ~$12/month
- **Total**: ~$30-50/month

---

## Troubleshooting Deployment

### Frontend can't reach backend

- Check `REACT_APP_API_URL` matches deployed backend URL
- Verify backend CORS origins include frontend domain
- Check browser console for specific error

### Google Sheets not updating

- Verify credentials.json is correctly uploaded
- Check service account has sheet editor access
- Look at backend logs for authentication errors

### Build failures

- Check build logs in deployment platform
- Ensure all dependencies are in `requirements.txt` or `package.json`
- Try building locally first

---

## Support

For issues:
1. Check backend logs in deployment platform
2. Check browser console (F12) for frontend errors
3. Test API directly: `curl https://your-backend-url/api/health`
4. Check Google Cloud console for authentication issues
