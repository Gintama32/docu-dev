#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# No special environment variables needed for Playwright

echo "Starting backend with Playwright support..."
echo "Checking PDF generation capabilities..."

# Test if Playwright is available - try multiple ways
if python -c "from playwright.sync_api import sync_playwright; print('✅ Playwright available')" 2>/dev/null; then
    echo "✅ Playwright is ready for PDF generation"
elif uv tool run --from playwright python -c "from playwright.sync_api import sync_playwright; print('✅ Playwright available (via uv tool)')" 2>/dev/null; then
    echo "✅ Playwright is ready for PDF generation (via uv tool)"
else
    echo "⚠️  Playwright not found. Trying to install..."
    uv tool run --from playwright playwright install chromium > /dev/null 2>&1 || echo "Failed to install, PDF generation may not work"
fi

# Change to backend directory and start the FastAPI server
mkdir -p "$SCRIPT_DIR/logs"
UVICORN_LOG_LEVEL=${UVICORN_LOG_LEVEL:-info}
# Try uv run first, fallback to direct python if project build fails
if uv run uvicorn backend.main:app --reload --port 8001 --log-level $UVICORN_LOG_LEVEL 2>/dev/null; then
    echo "Started with uv run"
else
    echo "uv run failed, trying direct python..."
    cd "$SCRIPT_DIR/.."
    PYTHONPATH=/Users/dawa/SherpaGCM/documaker python -m uvicorn backend.main:app --reload --port 8001 --log-level $UVICORN_LOG_LEVEL
fi