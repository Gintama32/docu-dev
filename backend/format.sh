#!/bin/bash

# Auto-formatting script for Python code
# Run this script to format your Python code with autoflake, isort, and Black

echo "🔧 Auto-fixing Python code..."

# Remove unused imports and variables
echo "🧹 Removing unused imports and variables with autoflake..."
uv run --with autoflake autoflake --in-place --remove-all-unused-imports --remove-unused-variables --recursive .

# Run isort to organize imports
echo "📦 Organizing imports with isort..."
uv run --with isort isort .

# Run Black to format code
echo "🎨 Formatting code with Black..."
uv run --with black black .

# Fix PEP 8 issues that Black doesn't handle
echo "🔧 Fixing PEP 8 issues with autopep8..."
uv run --with autopep8 autopep8 --in-place --recursive --max-line-length=120 .

echo "✅ Code auto-fixing complete!"

# Run flake8 for final linting check
echo "🔍 Running flake8 linting..."
uv run --with flake8 flake8 .

echo "🎉 All done!"
