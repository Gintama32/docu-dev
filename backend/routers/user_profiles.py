from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/api",
    tags=["user_profiles"],
    dependencies=[Depends(get_current_active_user)],
)

@router.get("/user-profiles", response_model=List[schemas.UserProfile])
def list_user_profiles(q: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_user_profiles(db, skip=skip, limit=limit, q=q)

@router.post("/user-profiles", response_model=schemas.UserProfile)
def create_user_profile(profile: schemas.UserProfileCreate, db: Session = Depends(get_db)):
    return crud.create_user_profile(db, profile)

@router.put("/user-profiles/{profile_id}", response_model=schemas.UserProfile)
def update_user_profile(profile_id: int, profile_update: schemas.UserProfileUpdate, db: Session = Depends(get_db)):
    updated = crud.update_user_profile(db, profile_id, profile_update)
    if not updated:
        raise HTTPException(status_code=404, detail="User profile not found")
    return updated

@router.delete("/user-profiles/{profile_id}")
def delete_user_profile(profile_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_user_profile(db, profile_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {"success": True}
