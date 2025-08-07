#!/bin/bash

# DocuMaker Quick Setup Script
# This script helps you set up the development environment

echo "🚀 DocuMaker Quick Setup"
echo "========================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "📋 Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
    echo "❌ Node.js is not installed."
    echo "   Please install Node.js v16 or higher from: https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
fi

# Check Python
if ! command_exists python3; then
    echo "❌ Python 3 is not installed."
    echo "   Please install Python 3.8 or higher"
    exit 1
else
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python found: $PYTHON_VERSION"
fi

# Check uv
if ! command_exists uv; then
    echo "❌ uv package manager is not installed."
    echo "   Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    
    # Source the shell configuration to make uv available
    if [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc"
    elif [ -f "$HOME/.zshrc" ]; then
        source "$HOME/.zshrc"
    fi
    
    if command_exists uv; then
        echo "✅ uv installed successfully"
    else
        echo "⚠️  uv installation may require a shell restart"
        echo "   Please restart your terminal and run this script again"
        exit 1
    fi
else
    echo "✅ uv package manager found"
fi

echo ""
echo "🔧 Setting up project..."

# Backend setup
echo "📦 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        echo "⚠️  Please edit backend/.env with your database configuration"
    else
        echo "⚠️  No .env.example found, please create .env manually"
    fi
fi

echo "📦 Installing Python dependencies..."
uv pip install -r requirements.txt

echo "✅ Backend setup complete"

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd ../frontend

echo "📦 Installing Node.js dependencies..."
npm install

echo "✅ Frontend setup complete"

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📍 Next steps:"
echo "1. Edit backend/.env with your database URL"
echo "2. Run database migrations: cd backend && alembic upgrade head"
echo "3. Create a user account: cd backend && python create_user.py"
echo "4. Start development servers: ./start_dev.sh"
echo ""
echo "📚 For detailed instructions, see README.md"
