#!/bin/bash
set -e

echo "🚀 Setting up development environment with uv..."

# Install uv if not already installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

echo "🔧 Installing dependencies..."
uv sync --dev

echo "✅ Development environment ready!"
echo ""
echo "🛠️  Available commands:"
echo "   uv run uvicorn backend.main:app --reload     # Start dev server"
echo "   uv run alembic upgrade head                  # Run migrations"
echo "   uv run python create_user.py                # Create test user"
echo "   ./format.sh                                  # Format code"
echo ""