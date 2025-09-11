"""
Resume Variable Resolver Service

Provides a single resolver that passes raw data to templates,
allowing templates to handle their own formatting and presentation logic.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from backend import models, crud


class ResumeVariableResolver:
    """
    Single variable resolver that provides raw data to templates.
    Templates handle all formatting and presentation logic using Jinja2.
    """

    def __init__(self, db: Session):
        self.db = db

    def resolve_variables(
        self,
        user_profile: Optional[models.UserProfile],
        experiences: List[models.Experience],
        proposal: Optional[models.ProjectProposal] = None,
        resume_id: Optional[int] = None,
        resume_alias: Optional[str] = None,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Resolve all template variables from raw data.

        Args:
            user_profile: User profile with personal info, skills, etc.
            experiences: List of selected experiences
            proposal: Optional proposal context
            resume_id: Resume ID for metadata
            resume_alias: Resume alias/name
            overrides: User-provided overrides for any variables

        Returns:
            Dictionary of all template variables
        """

        # Base variables with raw data
        variables = {
            # User profile data (full object + individual fields for convenience)
            "profile": self._serialize_profile(user_profile) if user_profile else None,
            # Experience data with client information
            "experiences": self._serialize_experiences(experiences),
            # Proposal context (optional)
            "proposal": self._serialize_proposal(proposal) if proposal else None,
            # Resume metadata
            "resume": {
                "id": resume_id,
                "alias": resume_alias,
                "generation_date": datetime.now().strftime("%B %d, %Y"),
                "generation_timestamp": datetime.now().isoformat(),
            },
            # Utility data
            "current_date": datetime.now().strftime("%B %d, %Y"),
            "current_year": datetime.now().year,
        }

        # Apply user overrides if provided
        if overrides:
            variables = self._apply_overrides(variables, overrides)

        return variables

    def _serialize_profile(self, profile: models.UserProfile) -> Dict[str, Any]:
        """Convert UserProfile to template-friendly dict."""
        return {
            "id": profile.id,
            "full_name": profile.full_name,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "current_title": profile.current_title,
            "professional_intro": profile.professional_intro,
            "department": profile.department,
            "employee_type": profile.employee_type,
            "is_current_employee": profile.is_current_employee,
            "email": profile.email,
            "mobile": profile.mobile,
            "address": profile.address,
            "about_url": profile.about_url,
            # Image URL
            "main_image_url": (
                f"http://localhost:8001/api/media/{profile.main_image_id}/raw"
                if profile.main_image_id
                else None
            ),
            # JSON fields (already parsed)
            "skills": profile.skills or [],
            "certifications": profile.certifications or [],
            "education": profile.education or [],
            # Computed fields for template convenience
            "display_name": profile.full_name
            or f"{profile.first_name} {profile.last_name}".strip(),
            "has_contact_info": bool(
                profile.email or profile.mobile or profile.address
            ),
            "skills_by_category": self._group_skills_by_category(profile.skills or []),
            "skill_count": len(profile.skills or []),
            "certification_count": len(profile.certifications or []),
            "education_count": len(profile.education or []),
        }

    def _serialize_experiences(
        self, experiences: List[models.Experience]
    ) -> List[Dict[str, Any]]:
        """Convert experiences to template-friendly format with client data."""
        serialized = []

        for exp in experiences:
            # Get client information if available
            client_info = None
            if exp.client_id:
                client = crud.get_client(self.db, exp.client_id)
                if client:
                    client_info = {
                        "id": client.id,
                        "client_name": client.client_name,
                        "website": client.website,
                        "main_email": client.main_email,
                        "main_phone": client.main_phone,
                        "main_contact": (
                            client.main_contact.contact_name
                            if client.main_contact
                            else None
                        ),
                    }

            # Format dates
            date_started = (
                exp.date_started.strftime("%B %Y") if exp.date_started else None
            )
            date_completed = (
                exp.date_completed.strftime("%B %Y")
                if exp.date_completed
                else "Present"
            )
            date_range = (
                f"{date_started or 'N/A'} - {date_completed}" if date_started else None
            )

            # Parse tags
            tags = [tag.strip() for tag in exp.tags.split(",")] if exp.tags else []

            serialized.append(
                {
                    "id": exp.id,
                    "project_name": exp.project_name,
                    "project_description": getattr(
                        exp, "_display_description", exp.project_description
                    ),
                    "location": exp.location,
                    "project_value": exp.project_value,
                    "date_started": exp.date_started,
                    "date_completed": exp.date_completed,
                    "date_started_formatted": date_started,
                    "date_completed_formatted": date_completed,
                    "date_range": date_range,
                    "tags": tags,
                    "tags_string": exp.tags,
                    "client": client_info,
                    "client_name": client_info["client_name"] if client_info else None,
                    # Computed fields
                    "has_client": bool(client_info),
                    "has_value": bool(exp.project_value),
                    "has_dates": bool(exp.date_started or exp.date_completed),
                    "is_current": exp.date_completed is None,
                    "duration_months": self._calculate_duration_months(
                        exp.date_started, exp.date_completed
                    ),
                }
            )

        return serialized

    def _serialize_proposal(self, proposal: models.ProjectProposal) -> Dict[str, Any]:
        """Convert proposal to template-friendly format."""
        # Get client information
        client_info = None
        if proposal.client_id:
            client = crud.get_client(self.db, proposal.client_id)
            if client:
                client_info = {
                    "id": client.id,
                    "client_name": client.client_name,
                    "main_contact": (
                        client.main_contact.contact_name
                        if client.main_contact
                        else None
                    ),
                }

        return {
            "id": proposal.id,
            "name": proposal.name,
            "context": proposal.context,
            "project_brief": proposal.project_brief,
            "status": proposal.status,
            "client": client_info,
            "client_name": client_info["client_name"] if client_info else None,
            "has_client": bool(client_info),
            "has_context": bool(proposal.context),
        }

    def _group_skills_by_category(
        self, skills: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Group skills by category for template convenience."""
        grouped = {}
        for skill in skills:
            category = skill.get("category", "Other")
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(skill)
        return grouped

    def _calculate_duration_months(self, start_date, end_date) -> Optional[int]:
        """Calculate duration in months between two dates."""
        if not start_date:
            return None

        end = end_date or datetime.now().date()

        # Simple month calculation
        months = (end.year - start_date.year) * 12 + (end.month - start_date.month)
        return max(1, months)  # At least 1 month

    def _apply_overrides(
        self, variables: Dict[str, Any], overrides: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply user overrides to variables."""

        # Deep merge overrides into variables
        def deep_merge(base, override):
            for key, value in override.items():
                if (
                    key in base
                    and isinstance(base[key], dict)
                    and isinstance(value, dict)
                ):
                    deep_merge(base[key], value)
                else:
                    base[key] = value

        deep_merge(variables, overrides)
        return variables


# Convenience function for easy usage
def resolve_resume_variables(
    db: Session,
    user_profile: Optional[models.UserProfile],
    experiences: List[models.Experience],
    proposal: Optional[models.ProjectProposal] = None,
    resume_id: Optional[int] = None,
    resume_alias: Optional[str] = None,
    overrides: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Convenience function to resolve resume variables.
    """
    resolver = ResumeVariableResolver(db)
    return resolver.resolve_variables(
        user_profile=user_profile,
        experiences=experiences,
        proposal=proposal,
        resume_id=resume_id,
        resume_alias=resume_alias,
        overrides=overrides,
    )
