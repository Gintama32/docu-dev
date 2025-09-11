"""
Authentication service for user management and JWT tokens
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx
import jwt
from dotenv import load_dotenv
from fastapi.security import HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .. import models

# Password hashing
# Use pbkdf2_sha256 to avoid external bcrypt backend issues
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Ensure environment variables from .env are loaded
load_dotenv()

# JWT settings
def get_secret_key():
    """Get SECRET_KEY with lazy loading and proper error handling"""
    from dotenv import load_dotenv
    import os
    
    # Try to load .env from the backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, '.env')
    load_dotenv(env_path)  # Load .env file from backend directory
    
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        raise RuntimeError(
            f"SECRET_KEY environment variable is required for token signing. "
            f"Set SECRET_KEY in your environment or .env file. Checked: {env_path}"
        )
    return secret_key

SECRET_KEY = get_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Microsoft Azure AD settings
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET")
MICROSOFT_TENANT_ID = os.getenv("MICROSOFT_TENANT_ID", "common")

security = HTTPBearer()


class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(
        data: Dict[str, Any], expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.PyJWTError:
            return None

    @staticmethod
    def create_user_session(
        db: Session, user_id: int, ip_address: str = None, user_agent: str = None
    ) -> str:
        """Create a new user session"""
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=30)  # Session lasts 30 days

        db_session = models.UserSession(
            user_id=user_id,
            session_token=session_token,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)

        return session_token

    @staticmethod
    def get_user_by_session(db: Session, session_token: str) -> Optional[models.User]:
        """Get user by session token"""
        session = (
            db.query(models.UserSession)
            .filter(
                models.UserSession.session_token == session_token,
                models.UserSession.is_active == True,
                models.UserSession.expires_at > datetime.utcnow(),
            )
            .first()
        )

        if session:
            # Update last accessed time
            session.last_accessed_at = datetime.utcnow()
            db.commit()
            return session.user
        return None

    @staticmethod
    def authenticate_user(
        db: Session, email: str, password: str
    ) -> Optional[models.User]:
        """Authenticate user with email and password"""
        user = (
            db.query(models.User)
            .filter(models.User.email == email, models.User.is_active == True)
            .first()
        )

        if not user or not user.hashed_password:
            return None

        if not AuthService.verify_password(password, user.hashed_password):
            return None

        # Update last login
        user.last_login_at = datetime.utcnow()
        db.commit()

        return user

    @staticmethod
    async def verify_microsoft_token(access_token: str) -> Optional[Dict[str, Any]]:
        """Verify Microsoft access token and get user info"""
        try:
            async with httpx.AsyncClient() as client:
                # Get user info from Microsoft Graph API
                headers = {"Authorization": f"Bearer {access_token}"}
                response = await client.get(
                    "https://graph.microsoft.com/v1.0/me", headers=headers
                )

                if response.status_code == 200:
                    user_data = response.json()
                    return {
                        "microsoft_id": user_data.get("id"),
                        "email": user_data.get("mail")
                        or user_data.get("userPrincipalName"),
                        "full_name": user_data.get("displayName"),
                        "first_name": user_data.get("givenName"),
                        "last_name": user_data.get("surname"),
                        "job_title": user_data.get("jobTitle"),
                        "department": user_data.get("department"),
                    }
        except Exception as e:
            print(f"Microsoft token verification failed: {e}")
            return None

    @staticmethod
    def create_or_update_sso_user(
        db: Session, microsoft_data: Dict[str, Any]
    ) -> models.User:
        """Create or update user from Microsoft SSO data"""
        # Check if user exists by Microsoft ID
        user = (
            db.query(models.User)
            .filter(models.User.microsoft_id == microsoft_data["microsoft_id"])
            .first()
        )

        if not user:
            # Check if user exists by email
            user = (
                db.query(models.User)
                .filter(models.User.email == microsoft_data["email"])
                .first()
            )

            if user:
                # Link existing user to Microsoft account
                user.microsoft_id = microsoft_data["microsoft_id"]
                user.sso_provider = "microsoft"
            else:
                # Create new user
                user = models.User(
                    email=microsoft_data["email"],
                    full_name=microsoft_data["full_name"],
                    first_name=microsoft_data.get("first_name"),
                    last_name=microsoft_data.get("last_name"),
                    job_title=microsoft_data.get("job_title"),
                    department=microsoft_data.get("department"),
                    microsoft_id=microsoft_data["microsoft_id"],
                    sso_provider="microsoft",
                    is_active=True,
                )
                db.add(user)
        else:
            # Update existing SSO user
            user.full_name = microsoft_data["full_name"]
            user.first_name = microsoft_data.get("first_name")
            user.last_name = microsoft_data.get("last_name")
            user.job_title = microsoft_data.get("job_title")
            user.department = microsoft_data.get("department")

        user.last_login_at = datetime.utcnow()
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def logout_user(db: Session, session_token: str) -> bool:
        """Invalidate user session"""
        session = (
            db.query(models.UserSession)
            .filter(models.UserSession.session_token == session_token)
            .first()
        )

        if session:
            session.is_active = False
            db.commit()
            return True
        return False


auth_service = AuthService()
