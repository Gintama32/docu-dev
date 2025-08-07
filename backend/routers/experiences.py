from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["experiences"])

@router.get("/experiences", response_model=List[schemas.Experience])
def get_experiences(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    experiences = crud.get_experiences(db, skip=skip, limit=limit)
    return experiences
