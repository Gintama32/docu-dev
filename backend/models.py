from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=True, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # Null for SSO users
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    # SSO fields
    microsoft_id = Column(
        String, unique=True, nullable=True, index=True
    )  # Azure AD object ID
    sso_provider = Column(String, nullable=True)  # 'microsoft', 'google', etc.

    # Profile fields
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

    # Preferences
    preferences = Column(
        JSON, nullable=True, default=dict
    )  # UI preferences, notifications, etc.

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    sessions = relationship("UserSession", back_populates="user")
    created_proposals = relationship("ProjectProposal", back_populates="created_by")
    notes = relationship("ProposalNote", back_populates="user")
    user_profiles = relationship("UserProfile", back_populates="user")


class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())
    last_accessed_at = Column(DateTime, default=func.now())
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="sessions")


class ProposalNote(Base):
    __tablename__ = "proposal_notes"
    id = Column(Integer, primary_key=True)
    proposal_id = Column(Integer, ForeignKey("project_proposals.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(
        String, default="comment"
    )  # 'comment', 'status_change', 'system'
    is_internal = Column(Boolean, default=True)  # Internal vs client-visible

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    proposal = relationship("ProjectProposal", back_populates="notes")
    user = relationship("User", back_populates="notes")


class ProjectProposal(Base):
    __tablename__ = "project_proposals"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    context = Column(Text)  # The core text for semantic search
    source = Column(String, default="manual")  # e.g., 'email', 'manual'

    # Enhanced proposal fields
    status = Column(
        String, default="draft"
    )  # draft, sent, under_review, accepted, rejected, on_hold
    location = Column(String)
    scope = Column(Text)  # Detailed scope description
    due_date = Column(Date)
    project_brief = Column(Text)  # Brief description/summary
    internal_notes = Column(Text)  # Internal team coordination notes

    client_id = Column(
        Integer, ForeignKey("clients.id"), nullable=True
    )  # Can be null initially
    contact_id = Column(
        Integer, ForeignKey("contacts.id"), nullable=True
    )  # Associated contact
    created_by_id = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # Who created this proposal

    client = relationship("Client")
    contact = relationship("Contact")
    created_by = relationship("User", back_populates="created_proposals")
    notes = relationship("ProposalNote", back_populates="proposal")

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    resumes = relationship("Resume", back_populates="project_proposal")


class Template(Base):
    __tablename__ = "templates"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    content = Column(Text, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    resumes = relationship("Resume", back_populates="template")


class Media(Base):
    __tablename__ = "media"
    id = Column(Integer, primary_key=True)
    cloudinary_public_id = Column(String(255), nullable=False, unique=True)
    cloudinary_url = Column(Text, nullable=False)
    preview_url = Column(Text)  # Thumbnail for images, first page for PDFs
    resource_type = Column(String(20), nullable=False)  # 'image' or 'pdf'
    format = Column(String(20))
    width = Column(Integer)
    height = Column(Integer)
    pages = Column(Integer)  # For PDFs
    bytes = Column(Integer)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=func.now())
    file_metadata = Column(JSON, default=dict)


class ProjectMedia(Base):
    __tablename__ = "project_media"
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    media_id = Column(
        Integer, ForeignKey("media.id", ondelete="CASCADE"), primary_key=True
    )
    media_type = Column(
        String(50), default="attachment"
    )  # 'hero_image', 'attachment', 'gallery'
    display_order = Column(Integer, default=0)
    caption = Column(Text)


class ProfileMedia(Base):
    __tablename__ = "profile_media"
    profile_id = Column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    media_id = Column(
        Integer, ForeignKey("media.id", ondelete="CASCADE"), primary_key=True
    )
    media_type = Column(
        String(50), primary_key=True
    )  # 'avatar', 'resume_pdf', 'certificate'
    is_primary = Column(Boolean, default=False)


class ResumeMedia(Base):
    __tablename__ = "resume_media"
    resume_id = Column(
        Integer, ForeignKey("resumes.id", ondelete="CASCADE"), primary_key=True
    )
    media_id = Column(
        Integer, ForeignKey("media.id", ondelete="CASCADE"), primary_key=True
    )
    media_type = Column(
        String(50), default="attachment"
    )  # 'generated_pdf', 'attachment'
    version = Column(Integer, default=1)


class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Basic Information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    full_name = Column(String(200), nullable=True)
    current_title = Column(String(200), nullable=True)
    professional_intro = Column(Text, nullable=True)  # renamed from 'intro'

    # Employment Information
    department = Column(String(100), nullable=True)
    employee_type = Column(String(50), nullable=True)  # contract/full-time/consultant
    is_current_employee = Column(Boolean, default=True, nullable=True)

    # Contact Information
    email = Column(String(255), nullable=True)
    mobile = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    about_url = Column(String(500), nullable=True)

    # JSON fields for collections
    skills = Column(JSON, nullable=True, default=list)
    certifications = Column(JSON, nullable=True, default=list)
    education = Column(JSON, nullable=True, default=list)

    # Legacy/System fields
    main_image_id = Column(Integer, ForeignKey("media.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="user_profiles")
    main_image = relationship("Media")
    resumes = relationship("Resume", back_populates="user_profile")


class ProfileExperience(Base):
    __tablename__ = "profile_experiences"
    id = Column(Integer, primary_key=True)
    user_profile_id = Column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )

    company_name = Column(String(200), nullable=True)
    position = Column(String(200), nullable=True)
    experience_start = Column(Date, nullable=True)
    experience_end = Column(Date, nullable=True)
    experience_detail = Column(Text, nullable=True)
    is_current = Column(Boolean, default=False, nullable=True)
    display_order = Column(Integer, default=0, nullable=True)

    # Relationship
    user_profile = relationship("UserProfile")

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user_profile = relationship("UserProfile")


class ProfileSkill(Base):
    __tablename__ = "profile_skills"
    id = Column(Integer, primary_key=True)
    user_profile_id = Column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )

    skill_name = Column(String(200), nullable=False)
    skill_level = Column(String(50), nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    category = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0, nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationship
    user_profile = relationship("UserProfile")


class ProfileCertification(Base):
    __tablename__ = "profile_certifications"
    id = Column(Integer, primary_key=True)
    user_profile_id = Column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )

    name = Column(String(200), nullable=False)
    issuing_organization = Column(String(200), nullable=False)
    issue_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=True)
    credential_id = Column(String(100), nullable=True)
    credential_url = Column(String(500), nullable=True)
    display_order = Column(Integer, default=0, nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationship
    user_profile = relationship("UserProfile")


class ProfileEducation(Base):
    __tablename__ = "profile_education"
    id = Column(Integer, primary_key=True)
    user_profile_id = Column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )

    institution = Column(String(200), nullable=False)
    degree = Column(String(200), nullable=False)
    field_of_study = Column(String(200), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    gpa = Column(Numeric(3, 2), nullable=True)
    description = Column(Text, nullable=True)
    activities = Column(Text, nullable=True)
    display_order = Column(Integer, default=0, nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationship
    user_profile = relationship("UserProfile")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=True)
    contract_value = Column(Numeric(12, 2), nullable=True)
    main_image_id = Column(Integer, ForeignKey("media.id"), nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    main_image = relationship("Media")


class Resume(Base):
    __tablename__ = "resumes"
    id = Column(Integer, primary_key=True)
    alias = Column(String, nullable=True)  # User-friendly name for the resume
    status = Column(String, default="draft", nullable=False)
    generated_content = Column(Text)

    project_proposal_id = Column(
        Integer, ForeignKey("project_proposals.id"), nullable=True
    )
    project_proposal = relationship("ProjectProposal", back_populates="resumes")

    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
    template = relationship("Template", back_populates="resumes")

    user_profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=True)
    user_profile = relationship("UserProfile", back_populates="resumes")

    # Relationship to ResumeExperienceDetail (ordered by display_order)
    resume_experience_details = relationship(
        "ResumeExperienceDetail",
        back_populates="resume",
        cascade="all, delete-orphan",
        order_by="ResumeExperienceDetail.display_order",
    )

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)


class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True)
    contact_name = Column(String, nullable=False)
    email = Column(String, unique=True)
    phone = Column(String)
    last_contact_date = Column(Date)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    client = relationship("Client", back_populates="contacts", foreign_keys=[client_id])
    experiences = relationship("Experience", back_populates="contact")


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True)
    client_name = Column(String, nullable=False, unique=True)
    website = Column(String)
    main_email = Column(String)
    main_phone = Column(String)
    last_contact_date = Column(Date)
    last_project_date = Column(Date)
    main_contact_id = Column(Integer, ForeignKey("contacts.id"))
    main_contact = relationship("Contact", foreign_keys=[main_contact_id])
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    contacts = relationship(
        "Contact", back_populates="client", foreign_keys=[Contact.client_id]
    )
    experiences = relationship("Experience", back_populates="client")


class Experience(Base):
    __tablename__ = "experiences"
    id = Column(Integer, primary_key=True)
    project_name = Column(String, nullable=False)
    project_description = Column(Text)
    project_value = Column(Numeric(10, 2))
    date_started = Column(Date)
    date_completed = Column(Date)
    location = Column(String)
    tags = Column(String)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    client = relationship("Client", back_populates="experiences")
    contact = relationship("Contact", back_populates="experiences")

    # Relationship to ResumeExperienceDetail
    resume_experience_details = relationship(
        "ResumeExperienceDetail", back_populates="experience"
    )


class ResumeExperienceDetail(Base):
    __tablename__ = "resume_experience_details"
    resume_id = Column(Integer, ForeignKey("resumes.id"), primary_key=True)
    experience_id = Column(Integer, ForeignKey("experiences.id"), primary_key=True)

    # Original description from the experience
    overridden_project_description = Column(Text, nullable=True)

    # AI-rewritten version of the experience description
    ai_rewritten_description = Column(Text, nullable=True)

    # Flag to determine which version to use (AI or custom)
    use_ai_version = Column(Boolean, default=False, nullable=False)

    display_order = Column(Integer, nullable=False, default=0)

    resume = relationship("Resume", back_populates="resume_experience_details")
    experience = relationship("Experience", back_populates="resume_experience_details")

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    def get_display_description(self) -> str:
        """Get the appropriate description based on the use_ai_version flag."""
        if self.use_ai_version and self.ai_rewritten_description:
            return self.ai_rewritten_description
        elif self.overridden_project_description:
            return self.overridden_project_description
        elif self.experience:
            return self.experience.project_description or ""
        return ""
