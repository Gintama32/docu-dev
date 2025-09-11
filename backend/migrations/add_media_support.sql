-- Media/Attachments table for storing file metadata
CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image', 'pdf', 'document'
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL, -- relative path or S3 URL
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}' -- for storing additional info like dimensions
);

-- Junction tables for associating media with different entities
CREATE TABLE IF NOT EXISTS project_media (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    PRIMARY KEY (project_id, media_id)
);

CREATE TABLE IF NOT EXISTS profile_media (
    profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL, -- 'avatar', 'resume', 'certificate'
    PRIMARY KEY (profile_id, media_id)
);

CREATE TABLE IF NOT EXISTS resume_template_media (
    template_name VARCHAR(100) NOT NULL,
    media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL, -- 'logo', 'background'
    PRIMARY KEY (template_name, media_id)
);

-- Indexes for performance
CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_file_type ON media(file_type);
CREATE INDEX idx_project_media_project ON project_media(project_id);
CREATE INDEX idx_profile_media_profile ON profile_media(profile_id);