#!/bin/bash

# Auto-formatting script for Python code
# Run this script to format your Python code with autoflake, isort, and Black

echo "🔧 Auto-fixing Python code..."

# Remove unused imports and variables
echo "🧹 Removing unused imports and variables with autoflake..."
poetry run autoflake --in-place --remove-all-unused-imports --remove-unused-variables --recursive .

# Run isort to organize imports
echo "📦 Organizing imports with isort..."
poetry run isort .

# Run Black to format code
echo "🎨 Formatting code with Black..."
poetry run black .

# Fix PEP 8 issues that Black doesn't handle
echo "🔧 Fixing PEP 8 issues with autopep8..."
poetry run autopep8 --in-place --recursive --max-line-length=120 .

echo "✅ Code auto-fixing complete!"

# Run flake8 for final linting check
echo "🔍 Running flake8 linting..."
poetry run flake8 .

echo "🎉 All done!"
