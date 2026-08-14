FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./
RUN npm install

COPY frontend/src ./src
COPY frontend/public ./public

# Build frontend with relative API URL (same origin)
ENV REACT_APP_API_URL=/api
RUN npm run build

# Backend stage
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn python-dotenv

# Copy backend code
COPY backend/ .

# Copy built frontend from frontend-build stage
COPY --from=frontend-build /app/frontend/build ./static

# Copy the baseline database (will be overridden by volume mount if exists)
COPY backend/activities.db ./activities.db

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:create_app()"]
