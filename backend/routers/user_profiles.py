from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
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
def list_user_profiles(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    only_mine: bool = True,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if only_mine and current_user:
        return crud.get_user_profiles_for_user(
            db, user_id=current_user.id, skip=skip, limit=limit, q=q
        )
    return crud.get_user_profiles(db, skip=skip, limit=limit, q=q)


@router.get("/user-profiles/{profile_id}", response_model=schemas.UserProfile)
def get_user_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = crud.get_user_profile(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile


@router.get("/user-profiles/{profile_id}/full", response_model=schemas.UserProfile)
def get_user_profile_full(profile_id: int, db: Session = Depends(get_db)):
    """Get complete user profile with all experiences and relationships"""
    profile = crud.get_user_profile_full(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile


@router.post("/user-profiles", response_model=schemas.UserProfile)
def create_user_profile(
    profile: schemas.UserProfileCreate, db: Session = Depends(get_db)
):
    return crud.create_user_profile(db, profile)


@router.put("/user-profiles/{profile_id}", response_model=schemas.UserProfile)
def update_user_profile(
    profile_id: int,
    profile_update: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
):
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


# Profile Experience endpoints
@router.get(
    "/user-profiles/{profile_id}/experiences",
    response_model=List[schemas.ProfileExperience],
)
def get_profile_experiences(profile_id: int, db: Session = Depends(get_db)):
    """Get all experiences for a profile"""
    return crud.get_profile_experiences_for_profile(db, profile_id)


@router.post(
    "/user-profiles/{profile_id}/experiences", response_model=schemas.ProfileExperience
)
def create_profile_experience(
    profile_id: int,
    experience: schemas.ProfileExperienceCreate,
    db: Session = Depends(get_db),
):
    """Add a new experience to a profile"""
    # Ensure the experience is linked to the correct profile
    experience.user_profile_id = profile_id
    return crud.create_profile_experience(db, experience)


@router.put(
    "/user-profiles/{profile_id}/experiences/{experience_id}",
    response_model=schemas.ProfileExperience,
)
def update_profile_experience(
    profile_id: int,
    experience_id: int,
    experience_update: schemas.ProfileExperienceUpdate,
    db: Session = Depends(get_db),
):
    """Update a specific experience"""
    # Verify the experience belongs to the profile
    existing = crud.get_profile_experience(db, experience_id)
    if not existing or existing.user_profile_id != profile_id:
        raise HTTPException(
            status_code=404, detail="Experience not found for this profile"
        )

    updated = crud.update_profile_experience(db, experience_id, experience_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Experience not found")
    return updated


@router.delete("/user-profiles/{profile_id}/experiences/{experience_id}")
def delete_profile_experience(
    profile_id: int, experience_id: int, db: Session = Depends(get_db)
):
    """Delete a specific experience"""
    # Verify the experience belongs to the profile
    existing = crud.get_profile_experience(db, experience_id)
    if not existing or existing.user_profile_id != profile_id:
        raise HTTPException(
            status_code=404, detail="Experience not found for this profile"
        )

    ok = crud.delete_profile_experience(db, experience_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Experience not found")
    return {"success": True}


@router.put("/user-profiles/{profile_id}/experiences/reorder")
def reorder_profile_experiences(
    profile_id: int, experience_ids: List[int], db: Session = Depends(get_db)
):
    """Reorder experiences by providing a list of experience IDs in the desired order"""
    ok = crud.reorder_profile_experiences(db, profile_id, experience_ids)
    if not ok:
        raise HTTPException(status_code=400, detail="Failed to reorder experiences")
    return {"success": True}


# Profile Skill endpoints
@router.get(
    "/user-profiles/{profile_id}/skills", response_model=List[schemas.ProfileSkill]
)
def get_profile_skills(profile_id: int, db: Session = Depends(get_db)):
    """Get all skills for a profile"""
    return crud.get_profile_skills_for_profile(db, profile_id)


@router.post("/user-profiles/{profile_id}/skills", response_model=schemas.ProfileSkill)
def create_profile_skill(
    profile_id: int, skill: schemas.ProfileSkillCreate, db: Session = Depends(get_db)
):
    """Add a new skill to a profile"""
    skill.user_profile_id = profile_id
    return crud.create_profile_skill(db, skill)


@router.put(
    "/user-profiles/{profile_id}/skills/{skill_id}", response_model=schemas.ProfileSkill
)
def update_profile_skill(
    profile_id: int,
    skill_id: int,
    skill_update: schemas.ProfileSkillUpdate,
    db: Session = Depends(get_db),
):
    """Update a specific skill"""
    existing = crud.get_profile_skill(db, skill_id)
    if not existing or existing.user_profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Skill not found for this profile")

    updated = crud.update_profile_skill(db, skill_id, skill_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Skill not found")
    return updated


@router.delete("/user-profiles/{profile_id}/skills/{skill_id}")
def delete_profile_skill(profile_id: int, skill_id: int, db: Session = Depends(get_db)):
    """Delete a specific skill"""
    existing = crud.get_profile_skill(db, skill_id)
    if not existing or existing.user_profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Skill not found for this profile")

    ok = crud.delete_profile_skill(db, skill_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"success": True}


@router.put("/user-profiles/{profile_id}/skills/reorder")
def reorder_profile_skills(
    profile_id: int, skill_ids: List[int], db: Session = Depends(get_db)
):
    """Reorder skills by providing a list of skill IDs in the desired order"""
    ok = crud.reorder_profile_skills(db, profile_id, skill_ids)
    if not ok:
        raise HTTPException(status_code=400, detail="Failed to reorder skills")
    return {"success": True}


# Profile Certification endpoints
@router.get(
    "/user-profiles/{profile_id}/certifications",
    response_model=List[schemas.ProfileCertification],
)
def get_profile_certifications(profile_id: int, db: Session = Depends(get_db)):
    """Get all certifications for a profile"""
    return crud.get_profile_certifications_for_profile(db, profile_id)


@router.post(
    "/user-profiles/{profile_id}/certifications",
    response_model=schemas.ProfileCertification,
)
def create_profile_certification(
    profile_id: int,
    certification: schemas.ProfileCertificationCreate,
    db: Session = Depends(get_db),
):
    """Add a new certification to a profile"""
    certification.user_profile_id = profile_id
    return crud.create_profile_certification(db, certification)


@router.put(
    "/user-profiles/{profile_id}/certifications/{certification_id}",
    response_model=schemas.ProfileCertification,
)
def update_profile_certification(
    profile_id: int,
    certification_id: int,
    certification_update: schemas.ProfileCertificationUpdate,
    db: Session = Depends(get_db),
):
    """Update a specific certification"""
    existing = crud.get_profile_certification(db, certification_id)
    if not existing or existing.user_profile_id != profile_id:
        raise HTTPException(
            status_code=404, detail="Certification not found for this profile"
        )

    updated = crud.update_profile_certification(
        db, certification_id, certification_update
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Certification not found")
    return updated


@router.delete("/user-profiles/{profile_id}/certifications/{certification_id}")
def delete_profile_certification(
    profile_id: int, certification_id: int, db: Session = Depends(get_db)
):
    """Delete a specific certification"""
    existing = crud.get_profile_certification(db, certification_id)
    if not existing or existing.user_profile_id != profile_id:
        raise HTTPException(
            status_code=404, detail="Certification not found for this profile"
        )

    ok = crud.delete_profile_certification(db, certification_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Certification not found")
    return {"success": True}


@router.put("/user-profiles/{profile_id}/certifications/reorder")
def reorder_profile_certifications(
    profile_id: int, certification_ids: List[int], db: Session = Depends(get_db)
):
    """Reorder certifications by providing a list of certification IDs in the desired order"""
    ok = crud.reorder_profile_certifications(db, profile_id, certification_ids)
    if not ok:
        raise HTTPException(status_code=400, detail="Failed to reorder certifications")
    return {"success": True}


# Profile Education endpoints
@router.get(
    "/user-profiles/{profile_id}/educations",
    response_model=List[schemas.ProfileEducation],
)
def get_profile_educations(profile_id: int, db: Session = Depends(get_db)):
    """Get all education entries for a profile"""
    return crud.get_profile_educations_for_profile(db, profile_id)


@router.post(
    "/user-profiles/{profile_id}/educations", response_model=schemas.ProfileEducation
)
def create_profile_education(
    profile_id: int,
    education: schemas.ProfileEducationCreate,
    db: Session = Depends(get_db),
):
    """Add a new education entry to a profile"""
    education.user_profile_id = profile_id
    return crud.create_profile_education(db, education)


@router.put(
    "/user-profiles/{profile_id}/educations/{education_id}",
    response_model=schemas.ProfileEducation,
)
def update_profile_education(
    profile_id: int,
    education_id: int,
    education_update: schemas.ProfileEducationUpdate,
    db: Session = Depends(get_db),
):
    """Update a specific education entry"""
    existing = crud.get_profile_education(db, education_id)
    if not existing or existing.user_profile_id != profile_id:
        raise HTTPException(
            status_code=404, detail="Education entry not found for this profile"
        )

    updated = crud.update_profile_education(db, education_id, education_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Education entry not found")
    return updated


@router.delete("/user-profiles/{profile_id}/educations/{education_id}")
def delete_profile_education(
    profile_id: int, education_id: int, db: Session = Depends(get_db)
):
    """Delete a specific education entry"""
    existing = crud.get_profile_education(db, education_id)
    if not existing or existing.user_profile_id != profile_id:
        raise HTTPException(
            status_code=404, detail="Education entry not found for this profile"
        )

    ok = crud.delete_profile_education(db, education_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Education entry not found")
    return {"success": True}


@router.put("/user-profiles/{profile_id}/educations/reorder")
def reorder_profile_educations(
    profile_id: int, education_ids: List[int], db: Session = Depends(get_db)
):
    """Reorder education entries by providing a list of education IDs in the desired order"""
    ok = crud.reorder_profile_educations(db, profile_id, education_ids)
    if not ok:
        raise HTTPException(
            status_code=400, detail="Failed to reorder education entries"
        )
    return {"success": True}
