#!/bin/bash
set -e

echo "Starting application..."

# Set working directory to app root and PYTHONPATH
cd /app
export PYTHONPATH=/app:$PYTHONPATH

# Test Playwright availability
echo "Testing Playwright availability..."
python -c "
try:
    from playwright.sync_api import sync_playwright
    print('✅ Playwright is working correctly!')
except Exception as e:
    print(f'❌ Playwright error: {e}')
    print('PDF generation will be disabled')
"

# Run database migrations from backend directory
echo "Running database migrations..."
cd backend
alembic upgrade head

# Go back to app root and start the FastAPI application
cd /app
echo "Starting FastAPI server..."
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001