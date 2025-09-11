from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/api",
    tags=["proposals"],
    dependencies=[Depends(get_current_active_user)],
)


@router.post("/proposals", response_model=schemas.ProjectProposal)
def create_project_proposal(
    proposal: schemas.ProjectProposalCreate, db: Session = Depends(get_db)
):
    return crud.create_project_proposal(db=db, proposal=proposal)


@router.get("/proposals", response_model=List[schemas.ProjectProposal])
def get_proposals(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    proposals = crud.get_project_proposals(db, skip=skip, limit=limit)
    return proposals


@router.put("/proposals/{proposal_id}", response_model=schemas.ProjectProposal)
def update_project_proposal(
    proposal_id: int,
    proposal_update: schemas.ProjectProposalUpdate,
    db: Session = Depends(get_db),
):
    db_proposal = crud.update_project_proposal(db, proposal_id, proposal_update)
    if db_proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return db_proposal


@router.delete("/proposals/{proposal_id}")
def delete_project_proposal(proposal_id: int, db: Session = Depends(get_db)):
    success = crud.delete_project_proposal(db, proposal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"message": "Proposal deleted successfully"}


@router.get("/proposals/{proposal_id}/resumes", response_model=List[schemas.Resume])
def get_resumes_for_proposal(proposal_id: int, db: Session = Depends(get_db)):
    resumes = crud.get_resumes_by_proposal(db, proposal_id)
    return resumes
