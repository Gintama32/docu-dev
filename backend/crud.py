from sqlalchemy.orm import Session, joinedload
from . import models, schemas

def get_experience(db: Session, experience_id: int):
    return db.query(models.Experience).filter(models.Experience.id == experience_id).first()

def get_experiences(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Experience).offset(skip).limit(limit).all()

def get_client(db: Session, client_id: int):
    return db.query(models.Client).filter(models.Client.id == client_id).first()

def get_clients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Client).offset(skip).limit(limit).all()

def create_client(db: Session, client: schemas.ClientCreate):
    db_client = models.Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

def get_contacts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Contact).offset(skip).limit(limit).all()

def get_project_proposal(db: Session, proposal_id: int):
    return db.query(models.ProjectProposal).filter(models.ProjectProposal.id == proposal_id).first()

def get_project_proposals(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.ProjectProposal).options(
        joinedload(models.ProjectProposal.client),
        joinedload(models.ProjectProposal.contact)
    ).offset(skip).limit(limit).all()

def create_project_proposal(db: Session, proposal: schemas.ProjectProposalCreate):
    db_proposal = models.ProjectProposal(**proposal.dict())
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return db_proposal

def update_project_proposal(db: Session, proposal_id: int, proposal_update: schemas.ProjectProposalUpdate):
    db_proposal = db.query(models.ProjectProposal).filter(models.ProjectProposal.id == proposal_id).first()
    if db_proposal:
        for key, value in proposal_update.dict(exclude_unset=True).items():
            setattr(db_proposal, key, value)
        db.add(db_proposal)
        db.commit()
        db.refresh(db_proposal)
    return db_proposal

def delete_project_proposal(db: Session, proposal_id: int):
    db_proposal = db.query(models.ProjectProposal).filter(models.ProjectProposal.id == proposal_id).first()
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
        name=template.name, 
        content=template.content,
        is_default=template.is_default
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

def create_resume(db: Session, resume: schemas.ResumeCreate):
    db_resume = models.Resume(
        project_proposal_id=resume.project_proposal_id,
        alias=resume.alias,
        template_id=resume.template_id,
        status=resume.status,
        generated_content=resume.generated_content
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    for i, exp_id in enumerate(resume.experience_ids):
        db_resume_exp_detail = models.ResumeExperienceDetail(
            resume_id=db_resume.id,
            experience_id=exp_id,
            display_order=i  # Use index as display order
        )
        db.add(db_resume_exp_detail)
    db.commit()
    db.refresh(db_resume)
    return db_resume

def get_resumes_by_proposal(db: Session, proposal_id: int):
    return db.query(models.Resume).filter(models.Resume.project_proposal_id == proposal_id).all()

def update_resume(db: Session, resume_id: int, resume_update: schemas.ResumeUpdate):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if db_resume:
        update_data = resume_update.dict(exclude_unset=True)
        
        # Handle experience_ids separately
        experience_ids = update_data.pop('experience_ids', None)
        
        # Update other fields
        for key, value in update_data.items():
            setattr(db_resume, key, value)
        
        # Update experiences if provided
        if experience_ids is not None:
            # Get existing experience relationships to preserve custom data
            existing_details = {
                red.experience_id: red 
                for red in db.query(models.ResumeExperienceDetail).filter(
                    models.ResumeExperienceDetail.resume_id == resume_id
                ).all()
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
                        display_order=i  # Use index as display order
                    )
                else:
                    # Create new relationship with proper display order
                    db_resume_exp_detail = models.ResumeExperienceDetail(
                        resume_id=resume_id,
                        experience_id=exp_id,
                        display_order=i  # Use index as display order
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
