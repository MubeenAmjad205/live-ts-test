#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $(jobs -p)
    exit
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM EXIT

echo "🚀 Starting Realtime Transcription System..."

# Start Backend
echo "📦 Starting Backend (FastAPI) on port 8000..."
cd backend
uv run uvicorn main:app --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "💻 Starting Frontend (Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Both servers are running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both."

# Keep the script running
wait
