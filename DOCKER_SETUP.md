# Docker Setup Guide

## What's Included

This project now includes complete Docker configuration for easy deployment:

- **docker-compose.yml** - Orchestrates frontend and backend
- **Dockerfile.backend** - Python Flask API container
- **frontend/Dockerfile** - React frontend container
- **.dockerignore** - Excludes unnecessary files

## Prerequisites

You need:
- **Docker** installed ([download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)

Check installation:
```bash
docker --version
docker-compose --version
```

## Quick Start (One Command!)

### Option 1: Full Setup with Docker

```bash
# Build and start all services
docker-compose up --build
```

That's it! Both frontend and backend will start automatically.

### Option 2: Development Mode

```bash
# Start with live code reloading
docker-compose up
```

### Option 3: Background Mode

```bash
# Run in background (detached mode)
docker-compose up -d
```

## Access the Application

After `docker-compose up`:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## Login Credentials

```
Username: admin
Password: password123
```

## Common Docker Commands

### Start Services
```bash
# Build and start
docker-compose up --build

# Start without rebuilding
docker-compose up

# Start in background
docker-compose up -d
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

### View Logs
```bash
# View all logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View frontend logs only
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100
```

### Execute Commands
```bash
# Run command in backend
docker-compose exec backend python -c "print('Hello')"

# Access backend shell
docker-compose exec backend /bin/bash

# Run command in frontend
docker-compose exec frontend npm list
```

### Check Status
```bash
# View running containers
docker-compose ps

# View detailed status
docker-compose ps -a

# Check container logs
docker logs badminton-backend
docker logs badminton-frontend
```

## Environment Variables

### Backend (.env)

```env
FLASK_ENV=development
SECRET_KEY=dev-secret-key-12345
GOOGLE_CREDENTIALS_PATH=credentials.json
GOOGLE_SHEET_ID=demo-sheet-id
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
PORT=5000
```

To change, edit `docker-compose.yml` environment section

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GAS_URL=https://your-deployment-url
```

To change, edit `docker-compose.yml` environment section

## Production Deployment

### Build Images Separately

```bash
# Build backend image
docker build -f Dockerfile.backend -t badminton-backend:1.0 .

# Build frontend image
docker build -f frontend/Dockerfile -t badminton-frontend:1.0 ./frontend
```

### Push to Registry

```bash
# Tag images
docker tag badminton-backend:1.0 yourregistry/badminton-backend:1.0
docker tag badminton-frontend:1.0 yourregistry/badminton-frontend:1.0

# Push to registry
docker push yourregistry/badminton-backend:1.0
docker push yourregistry/badminton-frontend:1.0
```

### Deploy on Server

```bash
# Pull images
docker pull yourregistry/badminton-backend:1.0
docker pull yourregistry/badminton-frontend:1.0

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### Container Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild images
docker-compose down
docker-compose up --build

# Remove all containers and images
docker-compose down -v
docker system prune -a
```

### Network Issues

```bash
# Check network
docker network ls

# Inspect network
docker network inspect badminton_badminton-network

# Restart networking
docker-compose down
docker network prune
docker-compose up --build
```

## Docker Files Explained

### docker-compose.yml

Orchestrates two services:
- **backend**: Flask API on port 5000
- **frontend**: React app on port 3000

Services communicate via internal network `badminton-network`

### Dockerfile.backend

Multi-stage build:
1. Installs Python dependencies
2. Copies code
3. Runs with Gunicorn
4. Includes health check

### frontend/Dockerfile

Two-stage build (optimized):
1. **Builder stage**: Install deps, build React
2. **Production stage**: Serve optimized build

Reduces final image size significantly

## Volume Mounting

For development with live reload:

```yaml
volumes:
  - ./backend:/app/backend  # Backend code
  - ./frontend/src:/app/src  # Frontend source
```

Changes to code auto-reload in containers!

## Health Checks

Both containers include health checks:

```bash
# Check container health
docker-compose ps

# Will show (healthy) or (unhealthy)
```

## Performance Tips

### Reduce Image Size
```bash
docker images
# Check image sizes

# Use .dockerignore to exclude unnecessary files
```

### Speed Up Builds
```bash
# Build with cache
docker-compose build --cache

# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker build ...
```

### Monitor Resources
```bash
# View resource usage
docker stats

# Limit resources in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Multi-Environment Setup

### Development
```bash
docker-compose up
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Create `docker-compose.prod.yml` with:
- Production images
- Increased resources
- No volume mounts
- Restart policies

## Clean Up

```bash
# Remove stopped containers
docker-compose rm

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

## Summary

**One command to rule them all:**
```bash
docker-compose up --build
```

- Builds both images
- Starts both services
- Connects them automatically
- Opens http://localhost:3000

That's it! Your app is running! 🚀

---

See: `DOCKER_CHEATSHEET.md` for more commands
