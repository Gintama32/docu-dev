#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# No special environment variables needed for Playwright

echo "Starting backend with Playwright support..."
echo "Checking PDF generation capabilities..."

# Test if Playwright is available - try multiple ways
if uv tool run --from playwright python -c "from playwright.sync_api import sync_playwright; print('✅ Playwright available (via uv tool)')" 2>/dev/null; then
    echo "✅ Playwright is ready for PDF generation (via uv tool)"
else
    echo "⚠️  Playwright not found. Trying to install..."
    uv tool run --from playwright playwright install chromium > /dev/null 2>&1 || echo "Failed to install, PDF generation may not work"
fi

# Change to backend directory and start the FastAPI server
mkdir -p "$SCRIPT_DIR/logs"
UVICORN_LOG_LEVEL=${UVICORN_LOG_LEVEL:-info}

# Change to the parent directory (where the backend package is)
cd "$SCRIPT_DIR/.."

# Skip uv run for now and use direct python approach that works
echo "Starting with direct python approach..."
export PYTHONPATH="$SCRIPT_DIR/.."
# uv run python -m uvicorn backend.main:app --reload --port 8001 --log-level $UVICORN_LOG_LEVEL
uv run uvicorn backend.main:app --reload --port 8001 --log-level $UVICORN_LOG_LEVEL | tee -a "$SCRIPT_DIR/logs/uvicorn.out"
