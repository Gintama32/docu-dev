from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List
from io import BytesIO
from pydantic import BaseModel
from jinja2 import Template
from datetime import datetime
from backend.services.resume_variable_resolver import resolve_resume_variables

from .. import crud, schemas, models
from ..database import get_db
from ..pdf_generator import PLAYWRIGHT_AVAILABLE, generate_pdf_from_html
from ..services.ai_service import ai_service
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/api",
    tags=["resumes"],
    dependencies=[Depends(get_current_active_user)],
)


# Pydantic models for AI-related requests
class ExperienceRewriteRequest(BaseModel):
    resume_id: int
    experience_id: int
    proposal_context: str
    original_description: str


class ToggleAIVersionRequest(BaseModel):
    resume_id: int
    experience_id: int
    use_ai: bool


class UpdateExperienceDescriptionRequest(BaseModel):
    resume_id: int
    experience_id: int
    description: str


class BulkAIRewriteRequest(BaseModel):
    resume_id: int


class SingleAIRewriteRequest(BaseModel):
    resume_id: int
    experience_id: int


class GenerateResumeRequest(BaseModel):
    resume_id: int


# Resume CRUD endpoints
@router.get("/resumes", response_model=List[schemas.Resume])
def get_resumes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all resumes"""
    return crud.get_resumes(db, skip=skip, limit=limit)


@router.get("/resumes/{resume_id}")
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    """Get a resume with its experience details"""
    resume = crud.get_resume(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Build response with experience details
    resume_data = {
        "id": resume.id,
        "alias": resume.alias,
        "status": resume.status,
        "generated_content": resume.generated_content,
        "project_proposal_id": resume.project_proposal_id,
        "template_id": resume.template_id,
        "user_profile_id": resume.user_profile_id,
        "created_at": resume.created_at,
        "updated_at": resume.updated_at,
        "resume_experience_details": [],
    }

    # Add experience details with proper data structure
    for red in resume.resume_experience_details:
        if red.experience:
            detail = {
                "resume_id": red.resume_id,
                "experience_id": red.experience_id,
                "overridden_project_description": red.overridden_project_description,
                "ai_rewritten_description": red.ai_rewritten_description,
                "use_ai_version": red.use_ai_version,
                "display_order": red.display_order,
                "created_at": red.created_at,
                "updated_at": red.updated_at,
                # Include the full experience data
                "experience": {
                    "id": red.experience.id,
                    "project_name": red.experience.project_name,
                    "project_description": red.experience.project_description,
                    "project_value": (
                        float(red.experience.project_value)
                        if red.experience.project_value
                        else None
                    ),
                    "date_started": (
                        red.experience.date_started.isoformat()
                        if red.experience.date_started
                        else None
                    ),
                    "date_completed": (
                        red.experience.date_completed.isoformat()
                        if red.experience.date_completed
                        else None
                    ),
                    "location": red.experience.location,
                    "tags": red.experience.tags,
                    "client_id": red.experience.client_id,
                    "contact_id": red.experience.contact_id,
                    "created_at": red.experience.created_at,
                    "updated_at": red.experience.updated_at,
                },
                # Add display description computed on backend
                "current_description": red.get_display_description(),
            }
            resume_data["resume_experience_details"].append(detail)

    return resume_data


@router.post("/resumes", response_model=schemas.Resume)
def create_resume(resume: schemas.ResumeCreate, db: Session = Depends(get_db)):
    # Get the proposal details (optional)
    proposal = None
    if resume.project_proposal_id:
        proposal = crud.get_project_proposal(db, resume.project_proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Project proposal not found")

    # Get the template
    default_template = crud.get_default_template(db)
    if not default_template:
        # Create a better default template if it doesn't exist
        template_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Resume{% if proposal %} - {{ proposal.name }}{% endif %}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
                .header h1 { color: #2c3e50; margin-bottom: 5px; }
                .header h2 { color: #7f8c8d; font-weight: normal; margin-top: 0; }
                .contact-info { margin: 10px 0; color: #666; }
                .contact-info span { margin-right: 20px; }
                h2 { color: #34495e; margin-top: 30px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
                h3 { color: #7f8c8d; margin-bottom: 5px; }
                .summary { margin: 20px 0; }
                .skills-section { margin: 20px 0; }
                .skills-list .skill { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; margin-right: 5px; }
                .experience { margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-left: 4px solid #3498db; }
                .client-info { color: #666; font-style: italic; margin: 5px 0; }
                .date-range { color: #666; font-size: 0.9em; margin: 5px 0; }
                .location { color: #666; font-size: 0.9em; margin: 5px 0; }
                .project-description { margin: 10px 0; }
                .project-value { color: #27ae60; font-weight: bold; margin: 5px 0; }
                .certifications-section { margin: 20px 0; }
                .certification { margin: 10px 0; }
                .metadata { color: #999; font-size: 0.9em; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
        </head>
        <body>
            <!-- Header with profile information -->
            {% if profile %}
            <div class="header">
                <h1>{{ profile.display_name }}</h1>
                {% if profile.current_title %}
                <h2>{{ profile.current_title }}</h2>
                {% endif %}
                {% if profile.has_contact_info %}
                <div class="contact-info">
                    {% if profile.email %}<span>{{ profile.email }}</span>{% endif %}
                    {% if profile.mobile %}<span>{{ profile.mobile }}</span>{% endif %}
                    {% if profile.address %}<span>{{ profile.address }}</span>{% endif %}
                </div>
                {% endif %}
            </div>
            {% endif %}
            
            <!-- Professional Introduction -->
            {% if profile and profile.professional_intro %}
            <div class="summary">
                <h2>Professional Summary</h2>
                <p>{{ profile.professional_intro }}</p>
            </div>
            {% endif %}
            
            <!-- Proposal Context (if applicable) -->
            {% if proposal %}
            <div class="proposal-context">
                <h2>{{ proposal.name }}</h2>
                {% if proposal.client_name %}
                <p class="client-info">Client: {{ proposal.client_name }}</p>
                {% endif %}
                {% if proposal.context %}
                <p>{{ proposal.context }}</p>
                {% endif %}
            </div>
            {% endif %}
            
            <!-- Skills (if available) -->
            {% if profile and profile.skills %}
            <div class="skills-section">
                <h2>Key Skills</h2>
                <div class="skills-list">
                    {% for skill in profile.skills %}
                    <span class="skill">{{ skill.name }}</span>{% if not loop.last %}, {% endif %}
                    {% endfor %}
                </div>
            </div>
            {% endif %}
            
            <!-- Experience -->
            {% if experiences %}
            <div class="experience-section">
                <h2>Relevant Experience</h2>
                {% for exp in experiences %}
                <div class="experience">
                    <h3>{{ exp.project_name }}</h3>
                    {% if exp.client_name %}
                    <p class="client-info">Client: {{ exp.client_name }}</p>
                    {% endif %}
                    {% if exp.date_range %}
                    <p class="date-range">{{ exp.date_range }}</p>
                    {% endif %}
                    {% if exp.location %}
                    <p class="location">Location: {{ exp.location }}</p>
                    {% endif %}
                    <div class="project-description">
                        <p>{{ exp.project_description }}</p>
                    </div>
                    {% if exp.project_value %}
                    <p class="project-value">Project Value: ${{ "{:,.0f}".format(exp.project_value) }}</p>
                    {% endif %}
                </div>
                {% endfor %}
            </div>
            {% endif %}
            
            <!-- Certifications (if available) -->
            {% if profile and profile.certifications %}
            <div class="certifications-section">
                <h2>Certifications</h2>
                {% for cert in profile.certifications %}
                <div class="certification">
                    <strong>{{ cert.name }}</strong>
                    {% if cert.issuer %} - {{ cert.issuer }}{% endif %}
                    {% if cert.date %} ({{ cert.date }}){% endif %}
                </div>
                {% endfor %}
            </div>
            {% endif %}
            
            <div class="metadata">
                <p>Generated on: {{ current_date }}</p>
                {% if resume.id %}<p>Resume ID: {{ resume.id }}</p>{% endif %}
            </div>
        </body>
        </html>
        """
        default_template = crud.create_template(
            db, schemas.TemplateCreate(name="Default", content=template_content)
        )

    # Get the experiences
    experiences = []
    for exp_id in resume.experience_ids:
        exp = crud.get_experience(db, exp_id)
        if exp:
            experiences.append(exp)

    # Get user profile if specified
    user_profile = None
    if resume.user_profile_id:
        user_profile = crud.get_user_profile(db, resume.user_profile_id)

    # Resolve all template variables using the new resolver
    template_variables = resolve_resume_variables(
        db=db,
        user_profile=user_profile,
        experiences=experiences,
        proposal=proposal,
        resume_id=None,  # Will be updated after creation
        resume_alias=resume.alias,
    )

    # Use Jinja2 to render the template
    template = Template(default_template.content)
    generated_content = template.render(**template_variables)

    resume.template_id = resume.template_id or default_template.id
    resume.generated_content = generated_content
    resume.status = "draft"  # Set initial status

    return crud.create_resume(db=db, resume=resume)


@router.put("/resumes/{resume_id}", response_model=schemas.Resume)
def update_resume(
    resume_id: int, resume_update: schemas.ResumeUpdate, db: Session = Depends(get_db)
):
    db_resume = crud.update_resume(db, resume_id, resume_update)
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return db_resume


@router.delete("/resumes/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = crud.delete_resume(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"message": "Resume deleted successfully"}


@router.get("/resumes/{resume_id}/pdf")
def generate_resume_pdf(resume_id: int, db: Session = Depends(get_db)):
    """Generate PDF from resume HTML content"""
    resume = crud.get_resume(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if not PLAYWRIGHT_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={
                "error": "PDF generation is not available",
                "message": "Playwright is not installed. To enable PDF generation, please install Playwright.",
                "instructions": {
                    "macOS": "brew install cairo pango gdk-pixbuf libffi && pip install weasyprint",
                    "Ubuntu/Debian": "apt-get install python3-cffi python3-brotli libpango-1.0-0 libpangoft2-1.0-0 && pip install weasyprint",
                    "alternative": "You can print the resume from your browser using Ctrl+P or Cmd+P",
                },
            },
        )

    try:
        # Generate PDF from the stored HTML content
        if not resume.generated_content:
            raise HTTPException(
                status_code=400, detail="No HTML content available for this resume"
            )

        pdf_bytes = generate_pdf_from_html(resume.generated_content)

        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=resume_{resume_id}.pdf"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


# AI-related endpoints
@router.post("/rewrite-experience")
async def rewrite_experience_for_proposal(
    request: ExperienceRewriteRequest, db: Session = Depends(get_db)
):
    """Use AI to rewrite experience description to align with proposal context"""

    # Get the resume and experience to ensure they exist
    resume = crud.get_resume(db, request.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    experience = crud.get_experience(db, request.experience_id)
    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")

    # Check if this experience is part of the resume
    resume_experience = next(
        (
            red
            for red in resume.resume_experience_details
            if red.experience_id == request.experience_id
        ),
        None,
    )

    if not resume_experience:
        raise HTTPException(
            status_code=400, detail="Experience not found in this resume"
        )

    # Use AI service to rewrite
    result = await ai_service.rewrite_experience(
        request.original_description, request.proposal_context
    )

    if result["success"]:
        # Update the resume_experience with the AI-rewritten description
        resume_experience.ai_rewritten_description = result["content"]
        db.add(resume_experience)
        db.commit()
        db.refresh(resume_experience)

        return {
            "rewritten_description": result["content"],
            "original_description": request.original_description,
            "saved": True,
            "use_ai_version": resume_experience.use_ai_version,
            "model_used": result.get("model_used"),
            "usage": result.get("usage"),
        }
    else:
        return {
            "rewritten_description": request.original_description,
            "message": result["error"],
            "saved": False,
        }


@router.post("/toggle-ai-version")
def toggle_ai_version(request: ToggleAIVersionRequest, db: Session = Depends(get_db)):
    """Toggle between AI and custom versions of an experience"""
    # Get the resume and experience to ensure they exist
    resume = crud.get_resume(db, request.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Check if this experience is part of the resume
    resume_experience = next(
        (
            red
            for red in resume.resume_experience_details
            if red.experience_id == request.experience_id
        ),
        None,
    )

    if not resume_experience:
        raise HTTPException(
            status_code=400, detail="Experience not found in this resume"
        )

    # Update the use_ai_version flag
    resume_experience.use_ai_version = request.use_ai
    db.add(resume_experience)
    db.commit()
    db.refresh(resume_experience)

    return {
        "success": True,
        "use_ai_version": resume_experience.use_ai_version,
        "description": resume_experience.get_display_description(),
    }


@router.post("/update-experience-description")
def update_experience_description(
    request: UpdateExperienceDescriptionRequest, db: Session = Depends(get_db)
):
    """Update the custom description for an experience"""
    # Get the resume and experience to ensure they exist
    resume = crud.get_resume(db, request.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Check if this experience is part of the resume
    resume_experience = next(
        (
            red
            for red in resume.resume_experience_details
            if red.experience_id == request.experience_id
        ),
        None,
    )

    if not resume_experience:
        raise HTTPException(
            status_code=400, detail="Experience not found in this resume"
        )

    # Update the custom description
    resume_experience.overridden_project_description = request.description
    db.add(resume_experience)
    db.commit()
    db.refresh(resume_experience)

    return {
        "success": True,
        "description": resume_experience.get_display_description(),
        "is_custom": True,
    }


@router.post("/bulk-ai-rewrite")
async def bulk_ai_rewrite_experiences(
    request: BulkAIRewriteRequest, db: Session = Depends(get_db)
):
    """Generate AI rewrites for all experiences in a resume"""
    # Get the resume
    resume = crud.get_resume(db, request.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    proposal = resume.project_proposal
    if not proposal:
        raise HTTPException(status_code=400, detail="Resume has no associated proposal")

    if not ai_service.is_available():
        return {
            "success": False,
            "message": "AI service not configured",
            "updated_experiences": [],
        }

    try:
        updated_experiences = []

        for resume_experience in resume.resume_experience_details:
            if (
                resume_experience.experience
                and resume_experience.experience.project_description
            ):

                result = await ai_service.rewrite_experience(
                    resume_experience.experience.project_description,
                    proposal.context or proposal.name,
                )

                if result["success"]:
                    # Update the resume_experience with the AI-rewritten description
                    resume_experience.ai_rewritten_description = result["content"]
                    db.add(resume_experience)

                    updated_experiences.append(
                        {
                            "experience_id": resume_experience.experience_id,
                            "project_name": resume_experience.experience.project_name,
                            "ai_rewritten_description": result["content"],
                        }
                    )

        db.commit()

        return {
            "success": True,
            "message": f"Generated AI rewrites for {len(updated_experiences)} experiences",
            "updated_experiences": updated_experiences,
        }

    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"Bulk AI rewriting failed: {str(e)}",
            "updated_experiences": [],
        }


@router.post("/single-ai-rewrite")
async def single_ai_rewrite_experience(
    request: SingleAIRewriteRequest, db: Session = Depends(get_db)
):
    """Generate AI rewrite for a single experience"""
    # Get the resume and experience to ensure they exist
    resume = crud.get_resume(db, request.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    experience = crud.get_experience(db, request.experience_id)
    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")

    # Check if this experience is part of the resume
    resume_experience = next(
        (
            red
            for red in resume.resume_experience_details
            if red.experience_id == request.experience_id
        ),
        None,
    )

    if not resume_experience:
        raise HTTPException(
            status_code=400, detail="Experience not found in this resume"
        )

    proposal = resume.project_proposal
    if not proposal:
        raise HTTPException(status_code=400, detail="Resume has no associated proposal")

    # Use AI service to rewrite
    result = await ai_service.rewrite_experience(
        experience.project_description, proposal.context or proposal.name
    )

    if result["success"]:
        # Update the resume_experience with the AI-rewritten description
        resume_experience.ai_rewritten_description = result["content"]
        db.add(resume_experience)
        db.commit()
        db.refresh(resume_experience)

        return {
            "success": True,
            "message": "AI rewrite generated successfully",
            "ai_rewritten_description": result["content"],
            "experience_id": request.experience_id,
            "model_used": result.get("model_used"),
            "usage": result.get("usage"),
        }
    else:
        return {
            "success": False,
            "message": result["error"],
            "ai_rewritten_description": experience.project_description,
        }


@router.post("/generate-final-resume")
def generate_final_resume(
    request: GenerateResumeRequest, db: Session = Depends(get_db)
):
    """Generate the final resume content using selected experience versions"""
    resume = crud.get_resume(db, request.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    proposal = resume.project_proposal
    template = resume.template or crud.get_default_template(db)

    # Get user profile
    user_profile = None
    if resume.user_profile_id:
        user_profile = crud.get_user_profile(db, resume.user_profile_id)

    # Collect experiences - pass the raw Experience objects to the resolver
    experiences = []
    for resume_exp in resume.resume_experience_details:
        if resume_exp.experience:
            # Create a copy of the experience with the display description
            exp_copy = resume_exp.experience
            # Store the display description for the resolver to use
            exp_copy._display_description = resume_exp.get_display_description()
            experiences.append(exp_copy)

    # Use the variable resolver to get all template variables
    try:
        template_variables = resolve_resume_variables(
            db=db,
            user_profile=user_profile,
            experiences=experiences,  # Pass the raw Experience objects
            proposal=proposal,
            resume_id=resume.id,
            resume_alias=resume.alias,
        )

        # Use the template to generate HTML content
        template_obj = Template(template.content)
        generated_content = template_obj.render(**template_variables)

        # Update the resume with the generated content
        resume.generated_content = generated_content
        db.add(resume)
        db.commit()
        db.refresh(resume)

        return {
            "success": True,
            "message": "Resume generated successfully",
            "generated_content": generated_content,
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Resume generation failed: {str(e)}",
            "generated_content": resume.generated_content or "",
        }


@router.post("/ai-rewrite-with-prompt")
async def ai_rewrite_with_prompt(request: dict, db: Session = Depends(get_db)):
    """Generate AI rewrite with custom prompt"""
    experience_id = request.get("experience_id")
    custom_prompt = request.get("custom_prompt", "").strip()

    if not experience_id:
        raise HTTPException(status_code=400, detail="Experience ID is required")

    if not custom_prompt:
        raise HTTPException(status_code=400, detail="Custom prompt is required")

    # Get the experience
    experience = crud.get_experience(db, experience_id)
    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")

    # Get the proposal context (assuming we can find it through resumes)
    resume_exp = (
        db.query(models.ResumeExperienceDetail)
        .filter(models.ResumeExperienceDetail.experience_id == experience_id)
        .first()
    )

    if not resume_exp:
        raise HTTPException(
            status_code=404, detail="Experience not associated with any resume"
        )

    resume = crud.get_resume(db, resume_exp.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    proposal = crud.get_project_proposal(db, resume.project_proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Use AI service with custom prompt
    try:
        result = await ai_service.rewrite_experience(
            original_description=experience.project_description or "",
            proposal_context=proposal.context or "",
            custom_prompt=custom_prompt,
        )

        if result["success"]:
            # Update the resume experience detail with the new AI description
            resume_exp.ai_rewritten_description = result["content"]
            db.add(resume_exp)
            db.commit()
            db.refresh(resume_exp)

            return {
                "success": True,
                "ai_rewritten_description": result["content"],
                "message": "AI rewrite with custom prompt completed successfully",
                "model_used": result.get("model_used", "unknown"),
                "usage": result.get("usage", {}),
            }
        else:
            return {
                "success": False,
                "message": result.get("error", "AI rewrite failed"),
                "ai_rewritten_description": experience.project_description,
            }

    except Exception as e:
        return {
            "success": False,
            "message": f"AI rewrite failed: {str(e)}",
            "ai_rewritten_description": experience.project_description,
        }


@router.post("/reorder-experiences")
def reorder_experiences(request: dict, db: Session = Depends(get_db)):
    """Reorder experiences for a resume"""
    resume_id = request.get("resume_id")
    experience_order = request.get("experience_order", [])

    if not resume_id:
        raise HTTPException(status_code=400, detail="Resume ID is required")

    if not experience_order:
        raise HTTPException(status_code=400, detail="Experience order is required")

    # Verify resume exists
    resume = crud.get_resume(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        # Update display_order for each experience
        for order_item in experience_order:
            experience_id = order_item.get("experience_id")
            display_order = order_item.get("display_order")

            if experience_id is None or display_order is None:
                continue

            # Find and update the resume experience detail
            resume_exp = (
                db.query(models.ResumeExperienceDetail)
                .filter(
                    models.ResumeExperienceDetail.resume_id == resume_id,
                    models.ResumeExperienceDetail.experience_id == experience_id,
                )
                .first()
            )

            if resume_exp:
                resume_exp.display_order = display_order
                db.add(resume_exp)

        db.commit()

        return {"success": True, "message": "Experience order updated successfully"}

    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"Failed to update experience order: {str(e)}",
        }
