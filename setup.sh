#!/bin/bash

# Badminton Activity Logger - Quick Start Script

echo "🏸 Badminton Activity Logger - Setup"
echo "===================================="
echo ""

# Check Python
echo "Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.9+"
    exit 1
fi
echo "✓ Python 3 found"

# Check Node
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi
echo "✓ Node.js found"

# Backend setup
echo ""
echo "Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install -q -r requirements.txt

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your credentials:"
    echo "   - GOOGLE_CREDENTIALS_PATH: path to credentials.json"
    echo "   - GOOGLE_SHEET_ID: your Google Sheet ID"
fi

# Check credentials
if [ ! -f "credentials.json" ]; then
    echo "⚠️  credentials.json not found"
    echo "   Please copy your Google Service Account JSON to backend/credentials.json"
fi

cd ..

# Frontend setup
echo ""
echo "Setting up Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install -q
fi

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

cd ..

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your Google credentials"
echo "2. Run: npm run dev (from project root) or:"
echo "   - Terminal 1: cd backend && source venv/bin/activate && python app.py"
echo "   - Terminal 2: cd frontend && npm start"
echo ""
echo "Then open http://localhost:3000"
