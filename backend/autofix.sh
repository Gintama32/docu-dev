#!/bin/bash

# Individual auto-fix commands for reference
# Use these commands individually when needed

echo "🛠️ Available auto-fix commands:"
echo ""
echo "1. Remove unused imports and variables:"
echo "   poetry run autoflake --in-place --remove-all-unused-imports --remove-unused-variables file.py"
echo ""
echo "2. Organize imports:"
echo "   poetry run isort file.py"
echo ""
echo "3. Format code:"
echo "   poetry run black file.py"
echo ""
echo "4. Fix PEP 8 issues:"
echo "   poetry run autopep8 --in-place --max-line-length=120 file.py"
echo ""
echo "5. Check what would be fixed (dry run):"
echo "   poetry run autoflake --check --remove-all-unused-imports file.py"
echo "   poetry run black --check --diff file.py"
echo "   poetry run autopep8 --diff file.py"
echo ""
echo "6. Run all formatting:"
echo "   ./format.sh"
echo ""
echo "7. Lint code:"
echo "   poetry run flake8 file.py"
echo ""

