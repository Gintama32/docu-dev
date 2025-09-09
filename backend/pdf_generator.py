"""
PDF generation module using Playwright for better compatibility
"""

import asyncio
import os
from typing import Optional

# Try to import Playwright
PLAYWRIGHT_AVAILABLE = False

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
    print("Playwright successfully loaded!")
except ImportError as e:
    print(f"Playwright not available: {e}")
    print("To install: pip install playwright && playwright install chromium")


async def _generate_pdf_async(html_content: str) -> bytes:
    """Async PDF generation using Playwright"""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Set the HTML content
        await page.set_content(html_content, wait_until="networkidle")
        
        # Generate PDF with good settings for resumes
        pdf_bytes = await page.pdf(
            format="A4",
            margin={
                "top": "0.5in",
                "right": "0.5in", 
                "bottom": "0.5in",
                "left": "0.5in"
            },
            print_background=True,
            prefer_css_page_size=True
        )
        
        await browser.close()
        return pdf_bytes


def generate_pdf_from_html(html_content: str) -> bytes:
    """
    Generate PDF from HTML content using Playwright

    Args:
        html_content: HTML string to convert to PDF

    Returns:
        PDF bytes

    Raises:
        RuntimeError: If Playwright is not available or PDF generation fails
    """
    if not PLAYWRIGHT_AVAILABLE:
        raise RuntimeError("Playwright is not available")

    try:
        # Run the async PDF generation
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            pdf_bytes = loop.run_until_complete(_generate_pdf_async(html_content))
            return pdf_bytes
        finally:
            loop.close()
    except Exception as e:
        print(f"PDF generation error: {e}")
        raise RuntimeError(f"Failed to generate PDF: {str(e)}")