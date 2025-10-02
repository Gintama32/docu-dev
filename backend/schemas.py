from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union, Literal

from pydantic import BaseModel, EmailStr, HttpUrl, Field, field_validator


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
    # These are optional with no special handling
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
    source: Optional[str] = "manual"
    status: Optional[str] = "draft"
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
    project_proposal_id: Optional[int] = None  # Made optional
    alias: Optional[str] = None  # User-friendly name for the resume
    template_id: Optional[int] = None  # Made optional
    user_profile_id: Optional[int] = None
    status: Optional[str] = "draft"  # Made optional
    generated_content: Optional[str] = None  # Made optional


class ResumeCreate(ResumeBase):
    experience_ids: List[int] = []  # List of experience IDs to link


class ResumeUpdate(BaseModel):
    alias: Optional[str] = None
    status: Optional[str] = None
    generated_content: Optional[str] = None
    experience_ids: Optional[List[int]] = None  # Allow updating experiences
    user_profile_id: Optional[int] = None
    template_id: Optional[int] = None


class Resume(ResumeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    generated_content: Optional[str] = (
        None  # Ensure generated_content is included in the response
    )

    class Config:
        from_attributes = True


# Media schemas
class MediaBase(BaseModel):
    media_uri: Optional[str] = None
    media_type: Optional[str] = None
    size_bytes: Optional[int] = None


class MediaCreate(MediaBase):
    # Inline binary not accepted via this schema for now
    pass


class Media(MediaBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# JSON field validation schemas
class CertificationItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    issuer: Optional[str] = Field(None, max_length=200)
    acquired_date: Optional[date] = None
    valid_until: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=100)


class SkillItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    level: Optional[Literal["Beginner", "Intermediate", "Advanced", "Expert"]] = (
        "Intermediate"
    )
    years: Optional[int] = Field(None, ge=0, le=50)
    category: Optional[str] = Field(None, max_length=100)


class EducationItem(BaseModel):
    institution: str = Field(..., min_length=1, max_length=200)
    degree: str = Field(..., min_length=1, max_length=200)
    field: Optional[str] = Field(None, max_length=200)
    graduation_year: Optional[int] = Field(None, ge=1950, le=2030)
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    honors: Optional[str] = Field(None, max_length=100)


# UserProfile schemas
class UserProfileBase(BaseModel):
    user_id: int

    # Basic Information
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    full_name: Optional[str] = Field(None, max_length=200)
    current_title: Optional[str] = Field(None, max_length=200)
    professional_intro: Optional[str] = None

    # Employment Information
    department: Optional[str] = Field(None, max_length=100)
    employee_type: Optional[Literal["contract", "full-time", "consultant"]] = None
    is_current_employee: Optional[bool] = True

    # Contact Information
    email: Optional[EmailStr] = None
    mobile: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    about_url: Optional[str] = None

    # Collections
    certifications: Optional[List[CertificationItem]] = []
    skills: Optional[List[SkillItem]] = []
    education: Optional[List[EducationItem]] = []

    # System fields
    main_image_id: Optional[int] = None


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(BaseModel):
    # Basic Information
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    full_name: Optional[str] = Field(None, max_length=200)
    current_title: Optional[str] = Field(None, max_length=200)
    professional_intro: Optional[str] = None

    # Employment Information
    department: Optional[str] = Field(None, max_length=100)
    employee_type: Optional[Literal["contract", "full-time", "consultant"]] = None
    is_current_employee: Optional[bool] = None

    # Contact Information
    email: Optional[EmailStr] = None
    mobile: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    about_url: Optional[str] = None

    # Collections
    certifications: Optional[List[CertificationItem]] = None
    skills: Optional[List[SkillItem]] = None
    education: Optional[List[EducationItem]] = None

    # System fields
    main_image_id: Optional[int] = None


class UserProfile(UserProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ProfileExperience schemas
class ProfileExperienceBase(BaseModel):
    user_profile_id: int
    company_name: Optional[str] = Field(None, max_length=200)
    position: Optional[str] = Field(None, max_length=200)
    experience_start: Optional[date] = None
    experience_end: Optional[date] = None
    experience_detail: Optional[str] = None
    is_current: Optional[bool] = False
    display_order: Optional[int] = 0


class ProfileExperienceCreate(ProfileExperienceBase):
    pass


class ProfileExperienceUpdate(BaseModel):
    company_name: Optional[str] = Field(None, max_length=200)
    position: Optional[str] = Field(None, max_length=200)
    experience_start: Optional[date] = None
    experience_end: Optional[date] = None
    experience_detail: Optional[str] = None
    is_current: Optional[bool] = None
    display_order: Optional[int] = None


class ProfileExperience(ProfileExperienceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ProfileSkill schemas
class ProfileSkillBase(BaseModel):
    user_profile_id: int
    skill_name: str = Field(..., max_length=200)
    skill_level: Optional[str] = Field(None, max_length=50)
    years_of_experience: Optional[int] = None
    category: Optional[str] = Field(None, max_length=100)
    display_order: Optional[int] = 0


class ProfileSkillCreate(ProfileSkillBase):
    pass


class ProfileSkillUpdate(BaseModel):
    skill_name: Optional[str] = Field(None, max_length=200)
    skill_level: Optional[str] = Field(None, max_length=50)
    years_of_experience: Optional[int] = None
    category: Optional[str] = Field(None, max_length=100)
    display_order: Optional[int] = None


class ProfileSkill(ProfileSkillBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ProfileCertification schemas
class ProfileCertificationBase(BaseModel):
    user_profile_id: int
    name: str = Field(..., max_length=200)
    issuing_organization: str = Field(..., max_length=200)
    issue_date: Optional[date] = None
    expiration_date: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=100)
    credential_url: Optional[HttpUrl] = None
    display_order: Optional[int] = 0


class ProfileCertificationCreate(ProfileCertificationBase):
    pass


class ProfileCertificationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    issuing_organization: Optional[str] = Field(None, max_length=200)
    issue_date: Optional[date] = None
    expiration_date: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=100)
    credential_url: Optional[HttpUrl] = None
    display_order: Optional[int] = None


class ProfileCertification(ProfileCertificationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ProfileEducation schemas
class ProfileEducationBase(BaseModel):
    user_profile_id: int
    institution: str = Field(..., max_length=200)
    degree: str = Field(..., max_length=200)
    field_of_study: str = Field(..., max_length=200)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    gpa: Optional[float] = None
    description: Optional[str] = None
    activities: Optional[str] = None
    display_order: Optional[int] = 0


class ProfileEducationCreate(ProfileEducationBase):
    pass


class ProfileEducationUpdate(BaseModel):
    institution: Optional[str] = Field(None, max_length=200)
    degree: Optional[str] = Field(None, max_length=200)
    field_of_study: Optional[str] = Field(None, max_length=200)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    gpa: Optional[float] = None
    description: Optional[str] = None
    activities: Optional[str] = None
    display_order: Optional[int] = None


class ProfileEducation(ProfileEducationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Project schemas
class ProjectBase(BaseModel):
    name: str
    
    # Multiple description fields for different purposes
    project_sheet_description: Optional[str] = None  # Detailed for project sheets
    project_sheet_description_brief: Optional[str] = None  # Brief summary
    resume_description: Optional[str] = None  # Concise for resumes
    
    contract_value: Optional[float] = None
    main_image_id: Optional[int] = None
    
    # Project sheet fields
    location: Optional[str] = None
    client_id: Optional[int] = None
    contact_id: Optional[int] = None
    project_details: Optional[Dict[str, Any]] = None


class ProjectCreate(ProjectBase):
    date: Any = None  # Accept any type, convert in validator

    @field_validator("date", mode="before")
    @classmethod
    def parse_date_string(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                raise ValueError("Date must be in ISO format (YYYY-MM-DD)")
        if isinstance(v, date):
            return v
        # For any other type, try to convert to None
        return None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    
    # Multiple description fields
    project_sheet_description: Optional[str] = None
    project_sheet_description_brief: Optional[str] = None
    resume_description: Optional[str] = None
    
    date: Any = None  # Accept any type, convert in validator
    contract_value: Optional[float] = None
    main_image_id: Optional[int] = None
    
    # Project sheet fields
    location: Optional[str] = None
    client_id: Optional[int] = None
    contact_id: Optional[int] = None
    project_details: Optional[Dict[str, Any]] = None

    @field_validator("date", mode="before")
    @classmethod
    def parse_date_string(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                raise ValueError("Date must be in ISO format (YYYY-MM-DD)")
        if isinstance(v, date):
            return v
        # For any other type, try to convert to None
        return None


class Project(ProjectBase):
    id: int
    date: Any = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator("date", mode="before")
    @classmethod
    def parse_date_for_response(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                return None
        if isinstance(v, date):
            return v
        return None
