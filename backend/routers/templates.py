from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..routers.auth import get_current_active_user
from ..services.template_service import template_service

router = APIRouter(
    prefix="/api",
    tags=["templates"],
    dependencies=[Depends(get_current_active_user)],
)


@router.get("/templates/default", response_model=schemas.Template)
def get_default_template(db: Session = Depends(get_db)):
    return crud.get_default_template(db)


@router.get("/templates", response_model=List[schemas.Template])
def list_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Use CRUD if available, else fallback to direct query (avoids hot-reload mismatch)
    if hasattr(crud, "get_templates"):
        return crud.get_templates(db, skip=skip, limit=limit)
    return db.query(models.Template).offset(skip).limit(limit).all()


@router.post("/templates/from-file", response_model=schemas.Template)
def create_template_from_file(
    name: str,
    template_filename: str,
    is_default: bool = False,
    db: Session = Depends(get_db),
):
    """Create a new template from a template file"""
    # Load template content from file
    template_content = template_service.load_template(template_filename)

    if template_content is None:
        raise HTTPException(
            status_code=404, detail=f"Template file '{template_filename}' not found"
        )

    # Create template in database
    template_data = schemas.TemplateCreate(
        name=name, content=template_content, is_default=is_default
    )

    return crud.create_template(db, template_data)


@router.get("/templates/files")
def list_template_files():
    """List available template files (development only)"""
    return {
        "files": template_service.list_available_templates(),
        "note": "Use POST /templates/from-file to create database templates from these files",
    }
