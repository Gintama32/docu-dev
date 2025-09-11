#!/usr/bin/env python3
"""
Script to insert template files into the database

Usage:
    python insert_template.py <template_file> <template_name> [--default]

Examples:
    python insert_template.py resume_template.html "Enhanced Resume Template"
    python insert_template.py simple_resume_template.html "Simple Resume" --default
"""

import sys
import os
import argparse
from pathlib import Path

# Add the backend directory to the Python path
sys.path.append(str(Path(__file__).parent))

from database import SessionLocal
import models


def load_template_file(filename):
    """Load template content from file"""
    template_dir = Path(__file__).parent / "templates"
    template_path = template_dir / filename

    if not template_path.exists():
        print(f"❌ Template file not found: {template_path}")
        return None

    try:
        with open(template_path, "r", encoding="utf-8") as f:
            content = f.read()
        print(f"✅ Loaded template file: {template_path}")
        print(f"📏 Template size: {len(content):,} characters")
        return content
    except Exception as e:
        print(f"❌ Error reading template file: {e}")
        return None


def insert_template(filename, name, is_default=False, update_if_exists=True):
    """Insert or update template in database"""
    db = SessionLocal()
    try:
        # Load template content
        content = load_template_file(filename)
        if not content:
            return False

        # Check if template already exists
        existing_template = (
            db.query(models.Template).filter(models.Template.name == name).first()
        )

        if existing_template:
            if update_if_exists:
                print(f"📝 Template '{name}' already exists. Updating...")
                existing_template.content = content
                if is_default:
                    # Unset other defaults first
                    db.query(models.Template).update({"is_default": False})
                    existing_template.is_default = True
                db.commit()
                print(f"✅ Template '{name}' updated successfully!")
                return True
            else:
                print(f"⚠️  Template '{name}' already exists. Use --force to update.")
                return False
        else:
            # If setting as default, unset other defaults first
            if is_default:
                print("🔄 Unsetting other default templates...")
                db.query(models.Template).update({"is_default": False})

            # Create new template
            new_template = models.Template(
                name=name, content=content, is_default=is_default
            )
            db.add(new_template)
            db.commit()
            db.refresh(new_template)

            default_text = " (set as DEFAULT)" if is_default else ""
            print(
                f"✅ Created new template: {new_template.name} (ID: {new_template.id}){default_text}"
            )
            return True

    except Exception as e:
        print(f"❌ Database error: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def list_templates():
    """List all templates in database"""
    db = SessionLocal()
    try:
        templates = db.query(models.Template).order_by(models.Template.id).all()

        if not templates:
            print("📋 No templates found in database.")
            return

        print(f"\n📋 Current templates in database ({len(templates)} total):")
        print("-" * 60)
        for template in templates:
            default_marker = " ⭐ DEFAULT" if template.is_default else ""
            size_info = f"({len(template.content):,} chars)"
            print(f"  {template.id:2d}. {template.name}{default_marker}")
            print(
                f"      Created: {template.created_at.strftime('%Y-%m-%d %H:%M')} {size_info}"
            )
        print("-" * 60)

    except Exception as e:
        print(f"❌ Error listing templates: {e}")
    finally:
        db.close()


def list_template_files():
    """List available template files"""
    template_dir = Path(__file__).parent / "templates"

    if not template_dir.exists():
        print(f"❌ Templates directory not found: {template_dir}")
        return

    html_files = list(template_dir.glob("*.html"))

    if not html_files:
        print(f"📁 No .html template files found in: {template_dir}")
        return

    print(f"\n📁 Available template files in {template_dir}:")
    print("-" * 50)
    for file_path in sorted(html_files):
        size = file_path.stat().st_size
        print(f"  • {file_path.name} ({size:,} bytes)")
    print("-" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="Insert template files into the database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python insert_template.py resume_template.html "Enhanced Resume Template"
  python insert_template.py simple_resume_template.html "Simple Resume" --default
  python insert_template.py --list
  python insert_template.py --list-files
        """,
    )

    parser.add_argument(
        "filename", nargs="?", help="Template filename (e.g., resume_template.html)"
    )
    parser.add_argument("name", nargs="?", help="Template name for database")
    parser.add_argument(
        "--default", action="store_true", help="Set as default template"
    )
    parser.add_argument(
        "--list", action="store_true", help="List all templates in database"
    )
    parser.add_argument(
        "--list-files", action="store_true", help="List available template files"
    )
    parser.add_argument(
        "--force", action="store_true", help="Force update if template exists"
    )

    args = parser.parse_args()

    # Handle list operations
    if args.list:
        list_templates()
        return

    if args.list_files:
        list_template_files()
        return

    # Validate required arguments
    if not args.filename or not args.name:
        print("❌ Error: Both filename and name are required")
        parser.print_help()
        sys.exit(1)

    # Insert template
    print(f"🚀 Inserting template: {args.filename} -> '{args.name}'")
    if args.default:
        print("⭐ Will set as DEFAULT template")

    success = insert_template(
        filename=args.filename,
        name=args.name,
        is_default=args.default,
        update_if_exists=args.force or True,  # Always update by default
    )

    if success:
        print("\n" + "=" * 50)
        list_templates()
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
