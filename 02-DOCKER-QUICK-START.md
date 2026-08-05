# 🐳 Docker Quick Start

## Install Docker First

Download: https://www.docker.com/products/docker-desktop

Verify installation:
```bash
docker --version
docker-compose --version
```

## One Command to Start Everything

```bash
docker-compose up --build
```

**That's it!** Both frontend and backend will start.

## Access the App

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Login

```
Username: admin
Password: password123
```

## Stop the App

```bash
# Stop all services
docker-compose down

# Stop and remove everything
docker-compose down -v
```

## View Logs

```bash
# All logs
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

## Common Issues

**Port already in use?**
```bash
# Kill process on port 3000
lsof -i :3000 | kill -9 ...

# Or use different port in docker-compose.yml
```

**Container won't start?**
```bash
docker-compose down
docker-compose up --build
```

**Network issues?**
```bash
docker network prune
docker-compose up --build
```

## Useful Commands

```bash
# Start in background
docker-compose up -d

# See running containers
docker-compose ps

# Restart a service
docker-compose restart backend

# Run command in container
docker-compose exec backend bash
```

## File Structure

```
badminton-activity-logger/
├── docker-compose.yml          ← Master config
├── Dockerfile.backend          ← Backend image
├── frontend/Dockerfile         ← Frontend image
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── .dockerignore
└── frontend/
    ├── src/
    └── .dockerignore
```

## What Gets Built

**Backend Container:**
- Python 3.11
- Flask API
- Auto-reload on code changes

**Frontend Container:**
- Node.js
- React app
- Optimized production build

**Network:**
- Both talk via internal network
- Frontend on :3000
- Backend on :5000

## Environment Variables

Edit in `docker-compose.yml`:

**Backend:**
- FLASK_ENV
- SECRET_KEY
- GOOGLE_SHEET_ID
- etc.

**Frontend:**
- REACT_APP_API_URL
- REACT_APP_GAS_URL
- etc.

## Next Steps

1. Install Docker
2. Run: `docker-compose up --build`
3. Open: http://localhost:3000
4. Login: admin / password123

Done! 🎉

---

See `DOCKER_SETUP.md` for advanced usage
