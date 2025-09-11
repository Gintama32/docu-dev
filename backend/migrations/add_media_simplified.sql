-- Simplified media table for Cloudinary storage
CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    cloudinary_public_id VARCHAR(255) NOT NULL UNIQUE,
    cloudinary_url TEXT NOT NULL,
    preview_url TEXT, -- Thumbnail for images, first page for PDFs
    resource_type VARCHAR(20) NOT NULL, -- 'image' or 'pdf'
    format VARCHAR(20),
    width INTEGER,
    height INTEGER,
    pages INTEGER, -- For PDFs
    bytes INTEGER,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_metadata JSONB DEFAULT '{}'
);

-- Association tables
CREATE TABLE IF NOT EXISTS project_media (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
    media_type VARCHAR(50) DEFAULT 'attachment', -- 'hero_image', 'attachment', 'gallery'
    display_order INTEGER DEFAULT 0,
    caption TEXT,
    PRIMARY KEY (project_id, media_id)
);

CREATE TABLE IF NOT EXISTS profile_media (
    profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL, -- 'avatar', 'resume_pdf', 'certificate'
    is_primary BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (profile_id, media_id, media_type)
);

CREATE TABLE IF NOT EXISTS resume_media (
    resume_id INTEGER REFERENCES resumes(id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
    media_type VARCHAR(50) DEFAULT 'attachment', -- 'generated_pdf', 'attachment'
    version INTEGER DEFAULT 1,
    PRIMARY KEY (resume_id, media_id)
);

-- Indexes
CREATE INDEX idx_media_resource_type ON media(resource_type);
CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_project_media_project ON project_media(project_id);
CREATE INDEX idx_profile_media_profile ON profile_media(profile_id);