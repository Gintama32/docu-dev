from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from .. import crud, models, schemas
from ..database import get_db
from .auth import get_current_active_user

router = APIRouter(
    prefix="/api",
    tags=["project_sheets"],
    dependencies=[Depends(get_current_active_user)],
)


@router.get("/project-sheets")
async def list_project_sheets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
) -> List[dict]:
    """List all generated project sheets"""
    sheets = db.query(models.ProjectSheet).join(
        models.Project, models.ProjectSheet.project_id == models.Project.id
    ).filter(
        models.ProjectSheet.generated_by == current_user.id
    ).order_by(
        models.ProjectSheet.created_at.desc()
    ).all()
    
    result = []
    for sheet in sheets:
        result.append({
            "id": sheet.id,
            "title": sheet.title,
            "project_id": sheet.project_id,
            "project_name": sheet.project.name,
            "status": sheet.status,
            "created_at": sheet.created_at.isoformat(),
            "updated_at": sheet.updated_at.isoformat(),
        })
    
    return result


@router.get("/project-sheets/{sheet_id}")
async def get_project_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get individual project sheet details"""
    sheet = db.query(models.ProjectSheet).join(
        models.Project, models.ProjectSheet.project_id == models.Project.id
    ).filter(
        models.ProjectSheet.id == sheet_id,
        models.ProjectSheet.generated_by == current_user.id
    ).first()
    
    if not sheet:
        raise HTTPException(status_code=404, detail="Project sheet not found")
    
    return {
        "id": sheet.id,
        "title": sheet.title,
        "project_id": sheet.project_id,
        "project_name": sheet.project.name,
        "status": sheet.status,
        "generated_content": sheet.generated_content,  # Include content for frontend rendering
        "created_at": sheet.created_at.isoformat(),
        "updated_at": sheet.updated_at.isoformat(),
    }


@router.post("/projects/{project_id}/sheet")
async def create_project_sheet(
    project_id: int,
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Create a project sheet record (no PDF generation yet - like resume workflow)"""
    title = request_data.get('title')
    # Get project with related data
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get related entities
    client = None
    contact = None
    
    if project.client_id:
        client = db.query(models.Client).filter(models.Client.id == project.client_id).first()
    
    if project.contact_id:
        contact = db.query(models.Contact).filter(models.Contact.id == project.contact_id).first()
    
    # Get main image URL if exists
    main_image_url = None
    if project.main_image_id:
        media = db.query(models.Media).filter(models.Media.id == project.main_image_id).first()
        if media:
            main_image_url = media.cloudinary_url
    
    try:
        print(f"DEBUG: Starting project sheet generation for project {project_id}")
        print(f"DEBUG: Project data - name: {project.name}, client_id: {project.client_id}")
        
        # Import dependencies first with specific error handling
        try:
            from jinja2 import Template
            print(f"DEBUG: Jinja2 imported successfully")
        except ImportError as e:
            print(f"DEBUG: Failed to import Jinja2: {e}")
            raise HTTPException(status_code=500, detail=f"Template engine not available: {e}")
            
        try:
            from ..services.template_service import template_service
            print(f"DEBUG: Template service imported successfully")
        except ImportError as e:
            print(f"DEBUG: Failed to import template service: {e}")
            raise HTTPException(status_code=500, detail=f"Template service not available: {e}")
            
        try:
            from ..pdf_generator import generate_pdf_from_html
            print(f"DEBUG: PDF generator imported successfully")
        except ImportError as e:
            print(f"DEBUG: Failed to import PDF generator: {e}")
            raise HTTPException(status_code=500, detail=f"PDF generator not available: {e}")
        
        template_data = {
            'project': {
                'name': project.name,
                'description': project.description,
                'date': project.date.strftime('%Y-%m-%d') if project.date else None,
                'contract_value': float(project.contract_value) if project.contract_value else None,
                'location': project.location,
                'main_image_url': main_image_url,
            },
            'client': {
                'name': client.client_name if client else None,
                'website': client.website if client else None,
                'email': client.main_email if client else None,
                'phone': client.main_phone if client else None,
            } if client else None,
            'contact': {
                'name': contact.contact_name if contact else None,
                'email': contact.email if contact else None,
                'phone': contact.phone if contact else None,
            } if contact else None,
            'user': {
                'name': current_user.full_name,
                'email': current_user.email,
            },
            'generated_date': datetime.now().strftime("%B %d, %Y at %I:%M %p")
        }
        
        print(f"DEBUG: Template data prepared: {template_data}")
        
        # Render the template to HTML (like resumes)
        # Load and render template
        template_content = template_service.load_template("project_sheet_template.html")
        if not template_content:
            raise HTTPException(status_code=404, detail="Project sheet template not found")
        
        template = Template(template_content)
        rendered_html = template.render(**template_data)
        
        print(f"DEBUG: Template rendered successfully")
        
        # Create ProjectSheet record with rendered HTML (like resumes)
        sheet_title = title or f"{project.name} - Project Sheet"
        
        project_sheet = models.ProjectSheet(
            project_id=project_id,
            title=sheet_title,
            generated_by=current_user.id,
            generated_content=rendered_html,  # Store rendered HTML like resumes
            template_data=template_data,
            status="generated"
        )
        db.add(project_sheet)
        db.commit()
        db.refresh(project_sheet)
        
        print(f"DEBUG: ProjectSheet record created with ID: {project_sheet.id}")
        
        # Return the sheet info for frontend navigation
        return {
            "id": project_sheet.id,
            "title": project_sheet.title,
            "project_id": project_sheet.project_id,
            "status": project_sheet.status,
            "generated_content": project_sheet.generated_content,  # Include content for frontend
            "message": "Project sheet created successfully"
        }
        
    except Exception as e:
        db.rollback()
        print(f"DEBUG: Exception during project sheet generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate project sheet: {str(e)}")


@router.get("/project-sheets/{sheet_id}/download")
async def download_project_sheet_pdf(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Download project sheet as PDF"""
    sheet = db.query(models.ProjectSheet).filter(
        models.ProjectSheet.id == sheet_id,
        models.ProjectSheet.generated_by == current_user.id
    ).first()
    
    if not sheet:
        raise HTTPException(status_code=404, detail="Project sheet not found")
    
    try:
        from ..pdf_generator import _generate_pdf_async
        
        # Use the stored generated_content for PDF generation
        if not sheet.generated_content:
            raise HTTPException(status_code=400, detail="Project sheet content not available")
        
        # Generate PDF from stored HTML content
        pdf_content = await _generate_pdf_async(sheet.generated_content)
        
        filename = f"{sheet.title.replace(' ', '_')}_sheet_{sheet.id}.pdf"
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download project sheet: {str(e)}")


@router.put("/project-sheets/{sheet_id}/regenerate")
async def regenerate_project_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Regenerate an existing project sheet with current project data"""
    # Get the existing sheet
    sheet = db.query(models.ProjectSheet).filter(
        models.ProjectSheet.id == sheet_id,
        models.ProjectSheet.generated_by == current_user.id
    ).first()
    
    if not sheet:
        raise HTTPException(status_code=404, detail="Project sheet not found")
    
    # Get current project data
    project = db.query(models.Project).filter(models.Project.id == sheet.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Get related entities with current data
        client = None
        contact = None
        
        if project.client_id:
            client = db.query(models.Client).filter(models.Client.id == project.client_id).first()
        
        if project.contact_id:
            contact = db.query(models.Contact).filter(models.Contact.id == project.contact_id).first()
        
        # Get main image URL if exists
        main_image_url = None
        if project.main_image_id:
            media = db.query(models.Media).filter(models.Media.id == project.main_image_id).first()
            if media:
                main_image_url = media.cloudinary_url
        
        # Prepare template data with current project information
        template_data = {
            'project': {
                'name': project.name,
                'description': project.description,
                'date': project.date.strftime('%Y-%m-%d') if project.date else None,
                'contract_value': float(project.contract_value) if project.contract_value else None,
                'location': project.location,
                'main_image_url': main_image_url,
            },
            'client': {
                'name': client.client_name if client else None,
                'website': client.website if client else None,
                'email': client.main_email if client else None,
                'phone': client.main_phone if client else None,
            } if client else None,
            'contact': {
                'name': contact.contact_name if contact else None,
                'email': contact.email if contact else None,
                'phone': contact.phone if contact else None,
            } if contact else None,
            'user': {
                'name': current_user.full_name,
                'email': current_user.email,
            },
            'generated_date': datetime.now().strftime("%B %d, %Y at %I:%M %p")
        }
        
        # Render the template with updated data
        template_content = template_service.load_template("project_sheet_template.html")
        if not template_content:
            raise HTTPException(status_code=404, detail="Project sheet template not found")
        
        template = Template(template_content)
        rendered_html = template.render(**template_data)
        
        # Update the existing sheet record
        sheet.generated_content = rendered_html
        sheet.template_data = template_data
        sheet.updated_at = datetime.now()
        
        db.commit()
        db.refresh(sheet)
        
        return {
            "id": sheet.id,
            "title": sheet.title,
            "project_id": sheet.project_id,
            "status": sheet.status,
            "generated_content": sheet.generated_content,
            "message": "Project sheet regenerated successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to regenerate project sheet: {str(e)}")


@router.delete("/project-sheets/{sheet_id}")
async def delete_project_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Delete a project sheet"""
    sheet = db.query(models.ProjectSheet).filter(
        models.ProjectSheet.id == sheet_id,
        models.ProjectSheet.generated_by == current_user.id
    ).first()
    
    if not sheet:
        raise HTTPException(status_code=404, detail="Project sheet not found")
    
    try:
        # Delete the sheet record (no PDF file to clean up since we generate on-demand)
        db.delete(sheet)
        db.commit()
        
        return {"message": "Project sheet deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete project sheet: {str(e)}")