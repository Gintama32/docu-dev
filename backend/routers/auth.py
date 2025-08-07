"""
Authentication router for login, registration, and user management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, models
from ..database import get_db
from ..services.auth_service import auth_service, security

router = APIRouter(prefix="/api/auth", tags=["authentication"])

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Try JWT token first
    payload = auth_service.verify_token(credentials.credentials)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user and user.is_active:
                return user
    
    # Try session token
    user = auth_service.get_user_by_session(db, credentials.credentials)
    if user:
        return user
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/register", response_model=schemas.LoginResponse)
def register(user_data: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    """Register a new user with email/password"""
    if not user_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for email registration"
        )
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = auth_service.get_password_hash(user_data.password)
    db_user = models.User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        department=user_data.department,
        job_title=user_data.job_title,
        phone=user_data.phone,
        hashed_password=hashed_password,
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create session and access token
    session_token = auth_service.create_user_session(
        db, db_user.id, 
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    access_token = auth_service.create_access_token(data={"sub": str(db_user.id)})
    
    return schemas.LoginResponse(
        access_token=access_token,
        user=schemas.User.model_validate(db_user)
    )

@router.post("/login", response_model=schemas.LoginResponse)
def login(login_data: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = auth_service.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create session and access token
    session_token = auth_service.create_user_session(
        db, user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    
    return schemas.LoginResponse(
        access_token=access_token,
        user=schemas.User.model_validate(user)
    )

@router.post("/microsoft-sso", response_model=schemas.LoginResponse)
async def microsoft_sso(sso_data: schemas.MicrosoftSSORequest, request: Request, db: Session = Depends(get_db)):
    """Login or register with Microsoft SSO"""
    # Verify Microsoft token
    microsoft_user_data = await auth_service.verify_microsoft_token(sso_data.access_token)
    if not microsoft_user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Microsoft access token"
        )
    
    # Create or update user
    user = auth_service.create_or_update_sso_user(db, microsoft_user_data)
    
    # Create session and access token
    session_token = auth_service.create_user_session(
        db, user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    
    return schemas.LoginResponse(
        access_token=access_token,
        user=schemas.User.model_validate(user)
    )

@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Logout current user"""
    if credentials:
        auth_service.logout_user(db, credentials.credentials)
    
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=schemas.User)
def get_current_user_profile(current_user: models.User = Depends(get_current_active_user)):
    """Get current user profile"""
    return schemas.User.model_validate(current_user)

@router.put("/me", response_model=schemas.User)
def update_current_user_profile(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    update_data = user_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    db.commit()
    db.refresh(current_user)
    
    return schemas.User.model_validate(current_user)

@router.get("/users", response_model=List[schemas.User])
def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of users (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    users = db.query(models.User).offset(skip).limit(limit).all()
    return [schemas.User.model_validate(user) for user in users]
