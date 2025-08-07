from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, schemas
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
