from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/api",
    tags=["experiences"],
    dependencies=[Depends(get_current_active_user)],
)


@router.get("/experiences", response_model=List[schemas.Experience])
def get_experiences(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    if q:
        return crud.search_experiences(db, q=q, skip=skip, limit=limit)
    return crud.get_experiences(db, skip=skip, limit=limit)


@router.post("/experiences", response_model=schemas.Experience)
def create_experience(experience: schemas.ExperienceCreate, db: Session = Depends(get_db)):
    return crud.create_experience(db, experience)


@router.put("/experiences/{experience_id}", response_model=schemas.Experience)
def update_experience(
    experience_id: int,
    experience: schemas.ExperienceCreate,
    db: Session = Depends(get_db),
):
    updated = crud.update_experience(db, experience_id, experience)
    if not updated:
        raise HTTPException(status_code=404, detail="Experience not found")
    return updated


@router.delete("/experiences/{experience_id}")
def delete_experience(experience_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_experience(db, experience_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Experience not found")
    return {"success": True}
