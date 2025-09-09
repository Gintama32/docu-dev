# UserProfile Enhancement Implementation Plan

## Overview

Enhance the UserProfile model to support comprehensive resume data while keeping the implementation simple and maintainable.

## Design Principles

1. **Simplicity First** - Avoid over-engineering
2. **Pragmatic Choices** - JSON for collections, columns for searchable fields
3. **Fast Development** - Minimal tables, maximum functionality
4. **Resume-Focused** - Optimize for resume generation, not complex queries

## Database Schema

### UserProfile Table (Enhanced)

```sql
user_profiles
├── id (PK)
├── user_id (FK to users)
├── main_image_id (FK to media) [existing]
│
├── [Basic Information - Direct Columns]
├── first_name (VARCHAR 100)
├── last_name (VARCHAR 100)
├── full_name (VARCHAR 200)
├── current_title (VARCHAR 200)
├── professional_intro (TEXT) [renamed from 'intro']
│
├── [Employment Information - Direct Columns]
├── department (VARCHAR 100)
├── employee_type (VARCHAR 50) [contract/full-time/consultant]
├── is_current_employee (BOOLEAN)
│
├── [Contact Information - Direct Columns]
├── email (VARCHAR 255)
├── mobile (VARCHAR 50)
├── address (VARCHAR 500)
├── about_url (VARCHAR 500)
│
├── [Collections - JSON Fields]
├── certifications (JSON) - List of certification objects
├── skills (JSON) - List of skill objects
├── education (JSON) - List of education objects
│
└── [Timestamps]
    ├── created_at [existing]
    └── updated_at [existing]
```

### ProfileExperience Table (New)

```sql
profile_experiences
├── id (PK)
├── user_profile_id (FK to user_profiles)
├── company_name (VARCHAR 200)
├── position (VARCHAR 200)
├── experience_start (DATE)
├── experience_end (DATE, nullable)
├── experience_detail (TEXT)
├── is_current (BOOLEAN)
├── display_order (INTEGER)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## JSON Field Structures

### Certifications
```json
[
  {
    "name": "AWS Solutions Architect",
    "issuer": "Amazon",
    "acquired_date": "2023-01-15",
    "valid_until": "2026-01-15",
    "credential_id": "ABC123",
    "url": "https://aws.amazon.com/verification/ABC123"
  }
]
```

### Skills
```json
[
  {
    "name": "Python",
    "level": "Expert",
    "years": 5,
    "category": "Programming Languages"
  },
  {
    "name": "Project Management",
    "level": "Advanced",
    "years": 3,
    "category": "Management"
  }
]
```

### Education
```json
[
  {
    "institution": "Massachusetts Institute of Technology",
    "degree": "Bachelor of Science",
    "field": "Computer Science",
    "graduation_year": 2018,
    "gpa": 3.8,
    "honors": "Magna Cum Laude"
  }
]
```

## Implementation TODO List

### Phase 1: Database Setup ⏳

- [ ] **1.1 Create Alembic migration**
  - [ ] Add new columns to user_profiles table
  - [ ] Rename 'intro' to 'professional_intro'
  - [ ] Create profile_experiences table
  - [ ] Add appropriate indexes

- [ ] **1.2 Update SQLAlchemy Models**
  - [ ] Update UserProfile model with new fields
  - [ ] Create ProfileExperience model
  - [ ] Define relationships
  - [ ] Add helper methods for computed fields

- [ ] **1.3 Create Pydantic Schemas**
  - [ ] Define JSON field validation schemas (SkillItem, CertificationItem, etc.)
  - [ ] Create UserProfileBase, UserProfileCreate, UserProfileUpdate schemas
  - [ ] Create ProfileExperienceBase, ProfileExperienceCreate, ProfileExperienceUpdate schemas
  - [ ] Add proper validation rules

### Phase 2: Backend API ⏳

- [ ] **2.1 Update CRUD Operations**
  - [ ] Extend user_profile CRUD for new fields
  - [ ] Create profile_experience CRUD operations
  - [ ] Add bulk operations for experiences
  - [ ] Handle display_order management

- [ ] **2.2 Create/Update API Endpoints**
  - [ ] GET `/api/user-profiles/{id}/full` - Get complete profile with experiences
  - [ ] PUT `/api/user-profiles/{id}` - Update profile (including JSON fields)
  - [ ] POST `/api/user-profiles/{id}/experiences` - Add experience
  - [ ] PUT `/api/user-profiles/{id}/experiences/{exp_id}` - Update experience
  - [ ] DELETE `/api/user-profiles/{id}/experiences/{exp_id}` - Delete experience
  - [ ] PUT `/api/user-profiles/{id}/experiences/reorder` - Reorder experiences

### Phase 3: Resume Integration ⏳

- [ ] **3.1 Update Resume Context**
  - [ ] Modify resume generation to fetch full profile
  - [ ] Add profile data to template context
  - [ ] Handle missing/optional fields gracefully

- [ ] **3.2 Update Resume Templates**
  - [ ] Add profile sections to default template
  - [ ] Create sections for skills, certifications, education
  - [ ] Style contact information header
  - [ ] Add conditional rendering for optional sections

### Phase 4: Frontend UI ⏳

- [ ] **4.1 Create Profile Management Page**
  - [ ] Create main ProfilePage component
  - [ ] Add routing to profile management
  - [ ] Create navigation from Personnel page

- [ ] **4.2 Basic Information Section**
  - [ ] Form for names, title, department
  - [ ] Employment type selector
  - [ ] Professional intro rich text editor
  - [ ] Auto-save functionality

- [ ] **4.3 Contact Information Section**
  - [ ] Simple form for email, mobile, address, URL
  - [ ] Validation for email and URL formats
  - [ ] Optional field indicators

- [ ] **4.4 Skills Management**
  - [ ] Add/Edit/Delete skills interface
  - [ ] Skill level selector
  - [ ] Category management
  - [ ] Reorder capability

- [ ] **4.5 Certifications Management**
  - [ ] Add/Edit/Delete certifications
  - [ ] Date pickers for acquired/expiry
  - [ ] URL validation
  - [ ] Expired certification indicators

- [ ] **4.6 Education Management**
  - [ ] Add/Edit/Delete education entries
  - [ ] Institution autocomplete (optional)
  - [ ] Graduation year picker
  - [ ] GPA validation

- [ ] **4.7 Experience Management**
  - [ ] Add/Edit/Delete experiences
  - [ ] Current position toggle
  - [ ] Date range validation
  - [ ] Rich text for experience details
  - [ ] Drag-and-drop reordering

### Phase 5: Polish & Testing ⏳

- [ ] **5.1 UI/UX Polish**
  - [ ] Profile completeness indicator
  - [ ] Section collapse/expand
  - [ ] Mobile responsive design
  - [ ] Loading states and error handling

- [ ] **5.2 Data Migration**
  - [ ] Script to migrate existing 'intro' data
  - [ ] Populate full_name from User table
  - [ ] Handle existing certificates JSON

- [ ] **5.3 Testing**
  - [ ] API endpoint tests
  - [ ] Frontend component tests
  - [ ] Resume generation tests
  - [ ] JSON validation tests

## Technical Decisions

### Why JSON for Collections?

1. **Simplicity** - No additional tables for skills, certifications, education
2. **Flexibility** - Easy to add new fields without migrations
3. **Performance** - Single query gets all data
4. **Good Enough** - Meets requirements without complexity

### Why Separate Table for Experiences?

1. **Complexity** - Multiple fields, needs ordering
2. **Size** - Can be lengthy text descriptions
3. **Future** - Might need to link with projects/proposals

### Field Storage Decisions

| Field Type | Storage | Reason |
|------------|---------|---------|
| Basic Info | Columns | Searchable, always single value |
| Contact Info | Columns | Common fields, direct access |
| Collections | JSON | Variable count, display only |
| Experiences | Table | Complex structure, ordering needed |

## API Response Example

```json
{
  "id": 1,
  "user_id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "current_title": "Senior Software Engineer",
  "department": "Engineering",
  "employee_type": "full-time",
  "is_current_employee": true,
  "professional_intro": "Experienced software engineer with 10+ years...",
  "email": "john.doe@example.com",
  "mobile": "+1-555-0123",
  "address": "San Francisco, CA",
  "about_url": "https://johndoe.dev",
  "skills": [
    {
      "name": "Python",
      "level": "Expert",
      "years": 5,
      "category": "Programming Languages"
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "acquired_date": "2023-01-15",
      "valid_until": "2026-01-15",
      "credential_id": "ABC123",
      "url": "https://aws.amazon.com/verification/ABC123"
    }
  ],
  "education": [
    {
      "institution": "MIT",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "graduation_year": 2018,
      "gpa": 3.8,
      "honors": "Magna Cum Laude"
    }
  ],
  "experiences": [
    {
      "id": 1,
      "company_name": "Tech Corp",
      "position": "Senior Engineer",
      "experience_start": "2020-01-01",
      "experience_end": null,
      "experience_detail": "Leading development of...",
      "is_current": true,
      "display_order": 0
    }
  ]
}
```

## Frontend Component Structure

```
ProfilePage/
├── ProfilePage.jsx (main container)
├── BasicInfoSection.jsx
├── ContactSection.jsx
├── SkillsSection.jsx
├── CertificationsSection.jsx
├── EducationSection.jsx
├── ExperiencesSection.jsx
└── ProfileCompleteness.jsx
```

## Migration Script Template

```sql
-- Add new columns
ALTER TABLE user_profiles
ADD COLUMN first_name VARCHAR(100),
ADD COLUMN last_name VARCHAR(100),
ADD COLUMN full_name VARCHAR(200),
ADD COLUMN current_title VARCHAR(200),
ADD COLUMN department VARCHAR(100),
ADD COLUMN employee_type VARCHAR(50),
ADD COLUMN is_current_employee BOOLEAN DEFAULT TRUE,
ADD COLUMN email VARCHAR(255),
ADD COLUMN mobile VARCHAR(50),
ADD COLUMN address VARCHAR(500),
ADD COLUMN about_url VARCHAR(500),
ADD COLUMN certifications JSON DEFAULT '[]'::json,
ADD COLUMN skills JSON DEFAULT '[]'::json,
ADD COLUMN education JSON DEFAULT '[]'::json;

-- Rename intro to professional_intro
ALTER TABLE user_profiles 
RENAME COLUMN intro TO professional_intro;

-- Create experiences table
CREATE TABLE profile_experiences (
    id SERIAL PRIMARY KEY,
    user_profile_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(200),
    position VARCHAR(200),
    experience_start DATE,
    experience_end DATE,
    experience_detail TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for experiences
CREATE INDEX idx_profile_experiences_user_profile_id 
ON profile_experiences(user_profile_id);

-- Create index for ordering
CREATE INDEX idx_profile_experiences_order 
ON profile_experiences(user_profile_id, display_order);
```

## Success Criteria

- [ ] All profile fields are editable through UI
- [ ] Resume templates can access all profile data
- [ ] Data validates properly (emails, URLs, dates)
- [ ] JSON fields handle add/edit/delete operations
- [ ] Experience ordering works correctly
- [ ] Profile changes reflect in resume generation
- [ ] Mobile responsive UI
- [ ] Proper error handling throughout

## Notes

- Start with backend (migration → models → API)
- Test with Postman/curl before building UI
- Keep UI simple - avoid over-designing
- Consider profile import features for Phase 2
- Monitor JSON field sizes (PostgreSQL JSON limit)
