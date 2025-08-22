from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/api",
    tags=["projects"],
    dependencies=[Depends(get_current_active_user)],
)


@router.get("/projects", response_model=List[schemas.Project])
def list_projects(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud.get_projects(db, skip=skip, limit=limit, q=q)


@router.post("/projects", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db, project)


@router.put("/projects/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, project: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    updated = crud.update_project(db, project_id, project)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated


@router.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_project(db, project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}
