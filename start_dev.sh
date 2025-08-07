#!/bin/bash

# DocuMaker Development Startup Script
# This script starts both the backend and frontend in development mode

echo "🚀 Starting DocuMaker Development Environment"
echo "=============================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

if ! command_exists python3; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

if ! command_exists uv; then
    echo "❌ uv is not installed. Please install uv package manager."
    echo "   Run: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "✅ All prerequisites found!"

# Function to start backend
start_backend() {
    echo "🔧 Starting Backend (FastAPI)..."
    # Ensure backend dependencies
    echo "📦 Installing backend dependencies..."
    (cd backend && uv pip install -r requirements.txt)

    # Run migrations
    echo "🗄️  Running database migrations..."
    (cd backend && uv run alembic upgrade head)

    # Start the server via backend/start_backend.sh (handles macOS lib paths)
    echo "🚀 Starting FastAPI server on port 8001..."
    bash backend/start_backend.sh &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
}

# Function to start frontend
start_frontend() {
    echo "⚛️  Starting Frontend (React + Vite)..."
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    
    # Start the development server
    echo "🚀 Starting Vite dev server on port 5173..."
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo "   Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "   Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    echo "✅ Development environment stopped."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start both services
start_backend
sleep 3  # Give backend time to start
start_frontend

echo ""
echo "🎉 Development environment is starting up!"
echo ""
echo "📍 Services:"
echo "   • Backend API: http://localhost:8001"
echo "   • Frontend App: http://localhost:5173"
echo "   • API Docs: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait
