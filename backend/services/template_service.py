"""
Template loading and management service
"""

import logging
import os
from typing import Optional

logger = logging.getLogger("app")


class TemplateService:
    """Service for loading and managing template files"""

    def __init__(self):
        self.templates_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "templates"
        )

    def load_template(self, template_name: str) -> Optional[str]:
        """
        Load template content from file

        Args:
            template_name: Name of the template file (with or without .html extension)

        Returns:
            Template content as string, or None if file not found
        """
        try:
            # Ensure .html extension
            if not template_name.endswith(".html"):
                template_name += ".html"

            template_path = os.path.join(self.templates_dir, template_name)

            if not os.path.exists(template_path):
                logger.warning(f"Template file not found: {template_path}")
                return None

            with open(template_path, "r", encoding="utf-8") as file:
                content = file.read()
                logger.info(f"Successfully loaded template: {template_name}")
                return content

        except Exception as e:
            logger.error(f"Error loading template {template_name}: {e}")
            return None

    def get_default_template_content(self) -> str:
        """
        Get the default resume template content

        Returns:
            Default template content as string
        """
        content = self.load_template("default_resume_template.html")

        if content is None:
            logger.warning("Default template file not found, using fallback")
            # Fallback to a minimal template if file is missing
            content = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Resume - {{ proposal.name }}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { color: #2c3e50; }
                    .experience { margin-bottom: 20px; padding: 15px; background: #f8f9fa; }
                </style>
            </head>
            <body>
                <h1>{{ proposal.name }}</h1>
                <h2>Experience</h2>
                {% for exp in experiences %}
                <div class="experience">
                    <h3>{{ exp.project_name }}</h3>
                    <p>{{ exp.project_description }}</p>
                </div>
                {% endfor %}
            </body>
            </html>
            """

        return content

    def list_available_templates(self) -> list[str]:
        """
        List all available template files

        Returns:
            List of template file names
        """
        try:
            templates = []
            for file in os.listdir(self.templates_dir):
                if file.endswith(".html"):
                    templates.append(file)
            return sorted(templates)
        except Exception as e:
            logger.error(f"Error listing templates: {e}")
            return []


# Global template service instance
template_service = TemplateService()
