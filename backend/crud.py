from typing import Optional

from sqlalchemy.orm import Session, joinedload

from . import models, schemas
from .services.auth_service import auth_service


def get_experience(db: Session, experience_id: int):
    return (
        db.query(models.Experience)
        .filter(models.Experience.id == experience_id)
        .first()
    )


def get_experiences(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Experience).offset(skip).limit(limit).all()


def search_experiences(db: Session, q: str, skip: int = 0, limit: int = 100):
    query = db.query(models.Experience)
    like = f"%{q}%"
    return (
        query.filter(
            (models.Experience.project_name.ilike(like))
            | (models.Experience.project_description.ilike(like))
            | (models.Experience.tags.ilike(like))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_experience(db: Session, experience: schemas.ExperienceCreate):
    db_exp = models.Experience(**experience.dict())
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    return db_exp


def update_experience(
    db: Session, experience_id: int, exp_update: schemas.ExperienceCreate
):
    db_exp = get_experience(db, experience_id)
    if not db_exp:
        return None
    for key, value in exp_update.dict(exclude_unset=True).items():
        setattr(db_exp, key, value)
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    return db_exp


def delete_experience(db: Session, experience_id: int) -> bool:
    db_exp = get_experience(db, experience_id)
    if not db_exp:
        return False
    db.delete(db_exp)
    db.commit()
    return True


def get_client(db: Session, client_id: int):
    return db.query(models.Client).filter(models.Client.id == client_id).first()


def get_clients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Client).offset(skip).limit(limit).all()


def create_client(db: Session, client: schemas.ClientCreate):
    try:
        # Use model_dump() for Pydantic v2 compatibility
        client_data = (
            client.model_dump() if hasattr(client, "model_dump") else client.dict()
        )
        db_client = models.Client(**client_data)
        db.add(db_client)
        db.commit()
        db.refresh(db_client)
        return db_client
    except Exception as e:
        db.rollback()
        raise e


def get_contacts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Contact).offset(skip).limit(limit).all()


def get_project_proposal(db: Session, proposal_id: int):
    return (
        db.query(models.ProjectProposal)
        .filter(models.ProjectProposal.id == proposal_id)
        .first()
    )


def get_project_proposals(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.ProjectProposal)
        .options(
            joinedload(models.ProjectProposal.client),
            joinedload(models.ProjectProposal.contact),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_project_proposal(db: Session, proposal: schemas.ProjectProposalCreate):
    db_proposal = models.ProjectProposal(**proposal.dict())
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return db_proposal


def update_project_proposal(
    db: Session, proposal_id: int, proposal_update: schemas.ProjectProposalUpdate
):
    db_proposal = (
        db.query(models.ProjectProposal)
        .filter(models.ProjectProposal.id == proposal_id)
        .first()
    )
    if db_proposal:
        for key, value in proposal_update.dict(exclude_unset=True).items():
            setattr(db_proposal, key, value)
        db.add(db_proposal)
        db.commit()
        db.refresh(db_proposal)
    return db_proposal


def delete_project_proposal(db: Session, proposal_id: int):
    db_proposal = (
        db.query(models.ProjectProposal)
        .filter(models.ProjectProposal.id == proposal_id)
        .first()
    )
    if db_proposal:
        db.delete(db_proposal)
        db.commit()
        return True
    return False


def get_template_by_name(db: Session, name: str):
    return db.query(models.Template).filter(models.Template.name == name).first()


def get_default_template(db: Session):
    """Get the default template marked with is_default=True"""
    return db.query(models.Template).filter(models.Template.is_default == True).first()


def create_template(db: Session, template: schemas.TemplateCreate):
    # If this template is being set as default, unset any existing default
    if template.is_default:
        db.query(models.Template).update({"is_default": False})

    db_template = models.Template(
        name=template.name, content=template.content, is_default=template.is_default
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


# User Profiles CRUD
def get_user_profile(db: Session, profile_id: int):
    return (
        db.query(models.UserProfile).filter(models.UserProfile.id == profile_id).first()
    )


def get_user_profile_full(db: Session, profile_id: int):
    """Get UserProfile - simple version"""
    return get_user_profile(db, profile_id)


def get_user_profiles(
    db: Session, skip: int = 0, limit: int = 100, q: str | None = None
):
    query = db.query(models.UserProfile)
    if q:
        like = f"%{q}%"
        query = query.filter(models.UserProfile.name.ilike(like))
    return query.offset(skip).limit(limit).all()


def get_user_profiles_for_user(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
):
    return (
        db.query(models.UserProfile)
        .filter(models.UserProfile.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_user_profile(db: Session, profile: schemas.UserProfileCreate):
    db_profile = models.UserProfile(**profile.dict())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


def update_user_profile(
    db: Session, profile_id: int, profile_update: schemas.UserProfileUpdate
):
    db_prof = get_user_profile(db, profile_id)
    if not db_prof:
        return None

    # Simple approach: convert to dict and handle JSON fields
    update_data = profile_update.dict(exclude_unset=True)

    for key, value in update_data.items():
        # Handle JSON fields: convert None to empty list
        if key in ["skills", "certifications", "education"] and value is None:
            value = []

        setattr(db_prof, key, value)

    db.commit()
    db.refresh(db_prof)
    return db_prof


def delete_user_profile(db: Session, profile_id: int):
    db_profile = get_user_profile(db, profile_id)
    if not db_profile:
        return False
    db.delete(db_profile)
    db.commit()
    return True


# Profile Experiences CRUD
def get_profile_experience(db: Session, experience_id: int):
    return (
        db.query(models.ProfileExperience)
        .filter(models.ProfileExperience.id == experience_id)
        .first()
    )


def get_profile_experiences_for_profile(db: Session, profile_id: int):
    return (
        db.query(models.ProfileExperience)
        .filter(models.ProfileExperience.user_profile_id == profile_id)
        .all()
    )


def create_profile_experience(db: Session, experience: schemas.ProfileExperienceCreate):
    db_exp = models.ProfileExperience(**experience.dict())
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    return db_exp


def update_profile_experience(
    db: Session, experience_id: int, experience_update: schemas.ProfileExperienceUpdate
):
    db_exp = get_profile_experience(db, experience_id)
    if not db_exp:
        return None
    for key, value in experience_update.dict(exclude_unset=True).items():
        setattr(db_exp, key, value)
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    return db_exp


def delete_profile_experience(db: Session, experience_id: int) -> bool:
    db_exp = get_profile_experience(db, experience_id)
    if not db_exp:
        return False
    db.delete(db_exp)
    db.commit()
    return True


# Profile Skills CRUD
def get_profile_skill(db: Session, skill_id: int):
    return (
        db.query(models.ProfileSkill).filter(models.ProfileSkill.id == skill_id).first()
    )


def get_profile_skills_for_profile(db: Session, profile_id: int):
    return (
        db.query(models.ProfileSkill)
        .filter(models.ProfileSkill.user_profile_id == profile_id)
        .all()
    )


def create_profile_skill(db: Session, skill: schemas.ProfileSkillCreate):
    db_skill = models.ProfileSkill(**skill.dict())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


def update_profile_skill(
    db: Session, skill_id: int, skill_update: schemas.ProfileSkillUpdate
):
    db_skill = get_profile_skill(db, skill_id)
    if not db_skill:
        return None
    for key, value in skill_update.dict(exclude_unset=True).items():
        setattr(db_skill, key, value)
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


def delete_profile_skill(db: Session, skill_id: int) -> bool:
    db_skill = get_profile_skill(db, skill_id)
    if not db_skill:
        return False
    db.delete(db_skill)
    db.commit()
    return True


# Profile Certifications CRUD
def get_profile_certification(db: Session, certification_id: int):
    return (
        db.query(models.ProfileCertification)
        .filter(models.ProfileCertification.id == certification_id)
        .first()
    )


def get_profile_certifications_for_profile(db: Session, profile_id: int):
    return (
        db.query(models.ProfileCertification)
        .filter(models.ProfileCertification.user_profile_id == profile_id)
        .all()
    )


def create_profile_certification(
    db: Session, certification: schemas.ProfileCertificationCreate
):
    db_cert = models.ProfileCertification(**certification.dict())
    db.add(db_cert)
    db.commit()
    db.refresh(db_cert)
    return db_cert


def update_profile_certification(
    db: Session,
    certification_id: int,
    certification_update: schemas.ProfileCertificationUpdate,
):
    db_cert = get_profile_certification(db, certification_id)
    if not db_cert:
        return None
    for key, value in certification_update.dict(exclude_unset=True).items():
        setattr(db_cert, key, value)
    db.add(db_cert)
    db.commit()
    db.refresh(db_cert)
    return db_cert


def delete_profile_certification(db: Session, certification_id: int) -> bool:
    db_cert = get_profile_certification(db, certification_id)
    if not db_cert:
        return False
    db.delete(db_cert)
    db.commit()
    return True


# Profile Education CRUD
def get_profile_education(db: Session, education_id: int):
    return (
        db.query(models.ProfileEducation)
        .filter(models.ProfileEducation.id == education_id)
        .first()
    )


def get_profile_educations_for_profile(db: Session, profile_id: int):
    return (
        db.query(models.ProfileEducation)
        .filter(models.ProfileEducation.user_profile_id == profile_id)
        .order_by(
            models.ProfileEducation.display_order.asc(),
            models.ProfileEducation.id.asc(),
        )
        .all()
    )


def create_profile_education(db: Session, education: schemas.ProfileEducationCreate):
    db_edu = models.ProfileEducation(**education.dict())
    db.add(db_edu)
    db.commit()
    db.refresh(db_edu)
    return db_edu


def update_profile_education(
    db: Session, education_id: int, education_update: schemas.ProfileEducationUpdate
):
    db_edu = get_profile_education(db, education_id)
    if not db_edu:
        return None
    update_data = education_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_edu, key, value)
    db.add(db_edu)
    db.commit()
    db.refresh(db_edu)
    return db_edu


def delete_profile_education(db: Session, education_id: int):
    db_edu = get_profile_education(db, education_id)
    if db_edu:
        db.delete(db_edu)
        db.commit()
        return True
    return False


def reorder_profile_educations(
    db: Session, profile_id: int, education_ids: list[int]
) -> bool:
    """Update display_order for multiple educations at once."""
    try:
        # Get all educations for this profile
        educations = get_profile_educations_for_profile(db, profile_id)
        education_map = {str(edu.id): edu for edu in educations}

        # Update display_order based on the provided order
        for order, edu_id in enumerate(education_ids, 1):
            if str(edu_id) in education_map:
                education_map[str(edu_id)].display_order = order

        db.commit()
        return True
    except Exception as e:
        db.rollback()
        return False


# Projects CRUD
def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()


def get_projects(db: Session, skip: int = 0, limit: int = 100, q: str | None = None):
    query = db.query(models.Project)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Project.name.ilike(like)) | (models.Project.description.ilike(like))
        )
    return query.offset(skip).limit(limit).all()


def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def create_project_from_fields(
    db: Session,
    *,
    name: str,
    description: Optional[str] = None,
    date=None,
    contract_value: Optional[float] = None,
    main_image_id: Optional[int] = None,
):
    db_project = models.Project(
        name=name,
        description=description,
        date=date,
        contract_value=contract_value,
        main_image_id=main_image_id,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    for key, value in project_update.dict(exclude_unset=True).items():
        setattr(db_project, key, value)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project_from_fields(
    db: Session,
    project_id: int,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    date=None,
    contract_value: Optional[float] = None,
    main_image_id: Optional[int] = None,
):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    if name is not None:
        db_project.name = name
    if description is not None:
        db_project.description = description
    if date is not None or date is None:
        db_project.date = date
    if contract_value is not None or contract_value is None:
        db_project.contract_value = contract_value
    if main_image_id is not None or main_image_id is None:
        db_project.main_image_id = main_image_id
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def delete_project(db: Session, project_id: int) -> bool:
    db_project = get_project(db, project_id)
    if not db_project:
        return False
    db.delete(db_project)
    db.commit()
    return True


def create_resume(db: Session, resume: schemas.ResumeCreate):
    db_resume = models.Resume(
        project_proposal_id=resume.project_proposal_id,
        alias=resume.alias,
        template_id=resume.template_id,
        user_profile_id=resume.user_profile_id,
        status=resume.status,
        generated_content=resume.generated_content,
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    for i, exp_id in enumerate(resume.experience_ids):
        db_resume_exp_detail = models.ResumeExperienceDetail(
            resume_id=db_resume.id,
            experience_id=exp_id,
            display_order=i,  # Use index as display order
        )
        db.add(db_resume_exp_detail)
    db.commit()
    db.refresh(db_resume)
    return db_resume


def get_resumes_by_proposal(db: Session, proposal_id: int):
    return (
        db.query(models.Resume)
        .filter(models.Resume.project_proposal_id == proposal_id)
        .all()
    )


def update_resume(db: Session, resume_id: int, resume_update: schemas.ResumeUpdate):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if db_resume:
        update_data = resume_update.dict(exclude_unset=True)

        # Handle experience_ids separately
        experience_ids = update_data.pop("experience_ids", None)
        # Allow updating user_profile_id
        update_data.get("user_profile_id", None)

        # Update other fields
        for key, value in update_data.items():
            setattr(db_resume, key, value)

        # Update experiences if provided
        if experience_ids is not None:
            # Get existing experience relationships to preserve custom data
            existing_details = {
                red.experience_id: red
                for red in db.query(models.ResumeExperienceDetail)
                .filter(models.ResumeExperienceDetail.resume_id == resume_id)
                .all()
            }

            # Remove all existing relationships
            db.query(models.ResumeExperienceDetail).filter(
                models.ResumeExperienceDetail.resume_id == resume_id
            ).delete()

            # Add experience relationships, preserving custom data where it exists
            for i, exp_id in enumerate(experience_ids):
                existing = existing_details.get(exp_id)

                if existing:
                    # Preserve existing custom data but update display_order based on new position
                    db_resume_exp_detail = models.ResumeExperienceDetail(
                        resume_id=resume_id,
                        experience_id=exp_id,
                        overridden_project_description=existing.overridden_project_description,
                        ai_rewritten_description=existing.ai_rewritten_description,
                        use_ai_version=existing.use_ai_version,
                        display_order=i,  # Use index as display order
                    )
                else:
                    # Create new relationship with proper display order
                    db_resume_exp_detail = models.ResumeExperienceDetail(
                        resume_id=resume_id,
                        experience_id=exp_id,
                        display_order=i,  # Use index as display order
                    )

                db.add(db_resume_exp_detail)

        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)
    return db_resume


def delete_resume(db: Session, resume_id: int):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if db_resume:
        db.delete(db_resume)
        db.commit()
    return db_resume


def get_resume(db: Session, resume_id: int):
    return db.query(models.Resume).filter(models.Resume.id == resume_id).first()


def get_resumes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Resume).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Create a new user with hashed password.

    Raises IntegrityError on duplicate email as enforced by the DB unique constraint.
    """
    if not user.password:
        raise ValueError("Password is required to create a user")

    hashed_password = auth_service.get_password_hash(user.password)

    db_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        first_name=user.first_name,
        last_name=user.last_name,
        department=user.department,
        job_title=user.job_title,
        phone=user.phone,
        hashed_password=hashed_password,
        is_active=True,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# Media CRUD
def list_media(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Media)
        .order_by(models.Media.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_media(db: Session, media_id: int):
    return db.query(models.Media).filter(models.Media.id == media_id).first()


def create_media(
    db: Session,
    *,
    media_type: Optional[str] = None,
    size_bytes: Optional[int] = None,
    image_content: Optional[bytes] = None,
    media_uri: Optional[str] = None,
) -> models.Media:
    media = models.Media(
        media_uri=media_uri,
        media_type=media_type,
        size_bytes=size_bytes,
        image_content=image_content,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


def delete_media(db: Session, media_id: int) -> bool:
    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if not media:
        return False
    db.delete(media)
    db.commit()
    return True
