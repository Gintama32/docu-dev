# Template Management System

This directory contains HTML templates for document generation in the SherpaGCM Document Maker.

## Template Files

- `default_resume_template.html` - Default resume template used when no custom template is specified
- `resume_template.html` - Standard resume template
- `simple_resume_template.html` - Simplified resume template
- `project_sheet_template.html` - Project sheet template
- `resume_template_backup.html` - Backup template

## Template Variables

Templates use Jinja2 syntax and have access to the following variables:

### Resume Templates
- `proposal` - The proposal object containing:
  - `name` - Proposal name
  - `client` - Client information (if available)
  - `context` - Proposal context/description
- `experiences` - List of experience objects containing:
  - `project_name` - Name of the project
  - `project_description` - Description of the project
  - `client` - Client information
  - `location` - Project location
  - `date_started` - Start date
  - `date_completed` - Completion date
- `resume` - Resume object containing:
  - `id` - Resume ID for tracking

## Usage

### Loading Templates in Code
```python
from services.template_service import template_service

# Load a specific template
content = template_service.load_template("my_template.html")

# Get default template content
default_content = template_service.get_default_template_content()

# List available templates
templates = template_service.list_available_templates()
```

### API Endpoints
- `GET /api/templates/files` - List available template files
- `POST /api/templates/from-file` - Create database template from file
- `GET /api/templates/available` - List template files (development only)

## Creating New Templates

1. Create your HTML file in this directory with `.html` extension
2. Use Jinja2 template syntax for dynamic content
3. Include necessary CSS styles within `<style>` tags
4. Test the template using the template service

## Template Structure

A typical template should include:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ proposal.name }}</title>
    <style>
        /* Your CSS styles here */
    </style>
</head>
<body>
    <!-- Your template content here -->
    <!-- Use {{ variable }} for single values -->
    <!-- Use {% for item in items %}...{% endfor %} for loops -->
    <!-- Use {% if condition %}...{% endif %} for conditionals -->
</body>
</html>
```

## Benefits

- **Separation of Concerns**: Templates are separate from application logic
- **Easy Maintenance**: Templates can be edited without code changes
- **Version Control**: Template changes are tracked in git
- **Reusability**: Templates can be loaded by multiple parts of the application
- **Development Friendly**: Template files list available during development

