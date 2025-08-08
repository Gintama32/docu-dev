#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set environment variables for WeasyPrint on macOS with Homebrew
export DYLD_LIBRARY_PATH="/opt/homebrew/lib:$DYLD_LIBRARY_PATH"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:$PKG_CONFIG_PATH"
export LDFLAGS="-L/opt/homebrew/lib"
export CPPFLAGS="-I/opt/homebrew/include"

# Additional paths for GObject and related libraries
export DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/lib:/usr/local/lib:/usr/lib"

echo "Starting backend with WeasyPrint support..."
echo "Library paths configured for Homebrew installations"

# Change to backend directory and start the FastAPI server
mkdir -p "$SCRIPT_DIR/logs"
UVICORN_LOG_LEVEL=${UVICORN_LOG_LEVEL:-info}
uv run uvicorn backend.main:app --reload --port 8001 --log-level $UVICORN_LOG_LEVEL | tee -a "$SCRIPT_DIR/logs/uvicorn.out"