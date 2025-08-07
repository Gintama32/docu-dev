from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import date, datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: Optional[str] = None  # Optional for SSO users
    microsoft_id: Optional[str] = None
    sso_provider: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    avatar_url: Optional[str] = None
    is_admin: bool = False
    sso_provider: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Authentication schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class MicrosoftSSORequest(BaseModel):
    access_token: str
    microsoft_id: str
    email: EmailStr
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

# Proposal Note schemas
class ProposalNoteBase(BaseModel):
    content: str
    note_type: str = "comment"
    is_internal: bool = True

class ProposalNoteCreate(ProposalNoteBase):
    proposal_id: int

class ProposalNote(ProposalNoteBase):
    id: int
    proposal_id: int
    user_id: int
    user: Optional[User] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Base schemas
class ProjectProposalBase(BaseModel):
    name: str
    context: Optional[str] = None
    source: Optional[str] = 'manual'
    status: Optional[str] = 'draft'
    location: Optional[str] = None
    scope: Optional[str] = None
    due_date: Optional[date] = None
    project_brief: Optional[str] = None
    internal_notes: Optional[str] = None
    client_id: Optional[int] = None
    contact_id: Optional[int] = None

class ProjectProposalCreate(ProjectProposalBase):
    pass

class ProjectProposalUpdate(BaseModel):
    name: Optional[str] = None
    context: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    scope: Optional[str] = None
    due_date: Optional[date] = None
    project_brief: Optional[str] = None
    internal_notes: Optional[str] = None
    client_id: Optional[int] = None
    contact_id: Optional[int] = None

class ClientSummary(BaseModel):
    id: int
    client_name: str
    
    class Config:
        from_attributes = True

class ContactSummary(BaseModel):
    id: int
    contact_name: str
    
    class Config:
        from_attributes = True

class ProjectProposal(ProjectProposalBase):
    id: int
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientSummary] = None
    contact: Optional[ContactSummary] = None

    class Config:
        from_attributes = True

class TemplateBase(BaseModel):
    name: str
    content: str

class TemplateCreate(TemplateBase):
    is_default: Optional[bool] = False

class Template(TemplateBase):
    id: int
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    client_name: str
    website: Optional[str] = None
    main_email: Optional[str] = None
    main_phone: Optional[str] = None
    last_contact_date: Optional[date] = None
    last_project_date: Optional[date] = None
    main_contact_id: Optional[int] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ContactBase(BaseModel):
    contact_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    last_contact_date: Optional[date] = None
    client_id: Optional[int] = None

class ContactCreate(ContactBase):
    pass

class Contact(ContactBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ExperienceBase(BaseModel):
    project_name: str
    project_description: Optional[str] = None
    project_value: Optional[float] = None
    date_started: Optional[date] = None
    date_completed: Optional[date] = None
    location: Optional[str] = None
    tags: Optional[str] = None
    client_id: int
    contact_id: Optional[int] = None

class ExperienceCreate(ExperienceBase):
    pass

class Experience(ExperienceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ResumeExperienceDetailBase(BaseModel):
    experience_id: int
    overridden_project_description: Optional[str] = None
    ai_rewritten_description: Optional[str] = None
    use_ai_version: bool = False
    display_order: Optional[int] = 0

class ResumeExperienceDetailCreate(ResumeExperienceDetailBase):
    pass

class ResumeExperienceDetail(ResumeExperienceDetailBase):
    resume_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ResumeBase(BaseModel):
    project_proposal_id: int
    alias: Optional[str] = None  # User-friendly name for the resume
    template_id: Optional[int] = None # Made optional
    status: Optional[str] = 'draft' # Made optional
    generated_content: Optional[str] = None # Made optional

class ResumeCreate(ResumeBase):
    experience_ids: List[int] = [] # List of experience IDs to link

class ResumeUpdate(BaseModel):
    alias: Optional[str] = None
    status: Optional[str] = None
    generated_content: Optional[str] = None
    experience_ids: Optional[List[int]] = None  # Allow updating experiences

class Resume(ResumeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    generated_content: Optional[str] = None # Ensure generated_content is included in the response

    class Config:
        from_attributes = True
