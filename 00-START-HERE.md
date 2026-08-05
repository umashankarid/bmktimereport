# 🏸 START HERE - Badminton Activity Logger

## What You Have

A **complete, production-ready website** for badminton trainers to log their activities → **Google Sheets**.

✅ **Everything is built and ready to use!**

## Your Google Sheet

```
Trainer Name | Date | Activity | Start Time | End Time | Note
```

Example:
```
John Smith | 2024-08-05 | Practice | 10:30 | 11:30 | Great session
```

## The Website

**Two pages:**
1. **Log Activity** - Simple form to record sessions
2. **Activity History** - View all logged activities

**Mobile-friendly** - Works on phones and tablets

## Getting Started (30 minutes)

### Step 1: Google Cloud Setup (15 min)
👉 **Read**: `SETUP.md` → Follow "Step 1: Google Cloud Setup"

You'll:
1. Create a Google Service Account
2. Download credentials.json
3. Create your Google Sheet
4. Share with service account

### Step 2: Run Locally (10 min)

**Terminal 1 - Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials (from Step 1)
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

### Step 3: Test (5 min)
1. Open http://localhost:3000
2. Fill the form:
   - Trainer: "Your Name"
   - Activity: "Practice"
   - Start: 10:30
   - End: 11:30
3. Click "Log Activity"
4. **Check your Google Sheet** - it should appear! ✨
5. Go to "Activity History" tab - you should see it

## Documentation

| File | Purpose |
|------|---------|
| **SETUP.md** | Complete setup guide (Google Cloud + local) |
| **QUICK_REFERENCE.md** | Commands and quick answers |
| **VERIFICATION_CHECKLIST.md** | Testing guide |
| **DEPLOYMENT.md** | How to deploy to production |
| **SCHEMA.md** | Data structure details |
| **PROJECT_SUMMARY.md** | Full architecture overview |
| **INDEX.md** | Complete file reference |

## What's Already Done

✅ Backend API with Flask
✅ Frontend with React
✅ Google Sheets integration
✅ Form with validation
✅ History viewer
✅ Mobile responsive
✅ Error handling
✅ All documentation

**You just need to:**
1. Set up Google Cloud (one-time)
2. Run the servers
3. Test it works
4. Deploy to production (optional)

## Quick Answers

**Q: Where do I get credentials?**
A: See SETUP.md → Step 1.3 (Create Service Account)

**Q: What are the required fields?**
A: All except "Note" - Trainer Name, Date, Activity, Start Time, End Time

**Q: How do I deploy it?**
A: See DEPLOYMENT.md (Render + Vercel recommended)

**Q: Can I change the columns?**
A: Yes, but edit `backend/sheets.py` line 15 and `backend/sheets.py` line 66-71

**Q: What if something breaks?**
A: Check browser console (F12) or backend logs for errors

## Files You'll Need to Create

1. **backend/credentials.json** - Download from Google Cloud
2. **backend/.env** - Copy from .env.example, add your Google Sheet ID
3. **frontend/.env** - Copy from .env.example

## The Tech Stack

- Backend: Python Flask + Google Sheets API
- Frontend: React + CSS3
- Database: Your Google Sheet (no setup needed!)
- Hosting: Render (backend) + Vercel (frontend)

## Next Steps

1. **Open SETUP.md** and follow the Google Cloud setup
2. **Come back here** after you have credentials.json
3. **Run the local setup** (steps in Getting Started above)
4. **Verify it works** using QUICK_REFERENCE.md
5. **Deploy** using DEPLOYMENT.md when ready

---

## Still Have Questions?

- **Setup problems?** → SETUP.md
- **Commands?** → QUICK_REFERENCE.md  
- **Testing?** → VERIFICATION_CHECKLIST.md
- **Architecture?** → PROJECT_SUMMARY.md
- **Everything?** → INDEX.md

---

## TL;DR

1. Get credentials from Google Cloud (SETUP.md)
2. Run `python app.py` in backend/
3. Run `npm start` in frontend/
4. Open http://localhost:3000
5. Log an activity
6. Check Google Sheet ✨

**Go to SETUP.md now!** 👉
