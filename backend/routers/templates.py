from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_current_active_user

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
