"""
PDF generation module with proper library path configuration for macOS
"""

import os
import platform

# Configure library paths for macOS with Homebrew
if platform.system() == "Darwin":
    # Set library paths for Homebrew installations
    homebrew_lib = "/opt/homebrew/lib"
    homebrew_lib_alt = "/usr/local/lib"

    # Try to set up the environment for finding dynamic libraries
    if os.path.exists(homebrew_lib):
        os.environ["DYLD_FALLBACK_LIBRARY_PATH"] = f"{homebrew_lib}:{os.environ.get('DYLD_FALLBACK_LIBRARY_PATH', '')}"
    elif os.path.exists(homebrew_lib_alt):
        os.environ["DYLD_FALLBACK_LIBRARY_PATH"] = (
            f"{homebrew_lib_alt}:{os.environ.get('DYLD_FALLBACK_LIBRARY_PATH', '')}"
        )

# Try to import WeasyPrint
WEASYPRINT_AVAILABLE = False
HTML = None

try:
    from weasyprint import HTML as WeasyprintHTML

    HTML = WeasyprintHTML
    WEASYPRINT_AVAILABLE = True
    print("WeasyPrint successfully loaded!")
except (ImportError, OSError) as e:
    print(f"WeasyPrint not available: {e}")
    print("\nTo fix this on macOS:")
    print("1. Install dependencies: brew install cairo pango gdk-pixbuf libffi glib")
    print("2. Reinstall WeasyPrint: pip uninstall weasyprint && pip install weasyprint")
    print("3. If still not working, try running with: DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib python")


def generate_pdf_from_html(html_content: str) -> bytes:
    """
    Generate PDF from HTML content with proper styling for resumes

    Args:
        html_content: HTML string to convert to PDF

    Returns:
        PDF bytes or None if generation fails
    """
    if not WEASYPRINT_AVAILABLE or not HTML:
        raise RuntimeError("WeasyPrint is not available. Please install system dependencies.")

    from io import BytesIO

    try:
        pdf_buffer = BytesIO()

        # Generate PDF with print-specific settings
        html = HTML(string=html_content, base_url=os.path.dirname(os.path.abspath(__file__)))

        # Configure PDF generation with proper page settings
        html.write_pdf(
            target=pdf_buffer,
            stylesheets=[],  # No additional stylesheets - all styles should be in the HTML
            presentational_hints=True,
            optimize_size=("fonts", "images", "content"),
            zoom=1.0,
            image_dpi=300,
            font_config=None,
            media_type="print",
            layout_context=None,
            weasyprint_version=None,
        )

        pdf_buffer.seek(0)
        return pdf_buffer.read()

    except Exception as e:
        error_msg = f"PDF generation failed: {str(e)}"
        print(error_msg)
        # Add more detailed error information if available
        if hasattr(e, "hints") and e.hints:
            print("Hints:", e.hints)
        raise RuntimeError(error_msg) from e


def generate_resume_pdf(resume_data: dict) -> bytes:
    """
    Generate a PDF from resume data using the simplified template

    Args:
        resume_data: Dictionary containing resume data

    Returns:
        PDF bytes
    """
    import os

    from jinja2 import Environment, FileSystemLoader

    try:
        # Set up Jinja2 environment
        env = Environment(loader=FileSystemLoader(os.path.dirname(os.path.abspath(__file__))))

        # Load the simplified template
        template = env.get_template("simple_resume_template.html")

        # Render the template with resume data
        html_content = template.render(resume=resume_data)

        # Generate the PDF
        return generate_pdf_from_html(html_content)

    except Exception as e:
        error_msg = f"Failed to generate resume PDF: {str(e)}"
        print(error_msg)
        raise RuntimeError(error_msg) from e
