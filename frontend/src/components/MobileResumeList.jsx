import React from 'react';
import './MobileResumeList.css';

function MobileResumeList({ 
  resumes, 
  filteredResumes, 
  onEditResume, 
  onDeleteResume, 
  onDownloadPdf,
  formatDate,
  getDisplayName 
}) {
  if (filteredResumes.length === 0) {
    return (
      <div className="mobile-empty-state">
        <div className="empty-state-icon">📄</div>
        <h3>No resumes found</h3>
        <p>{resumes.length === 0 ? 'Create your first resume!' : 'No resumes match your filters.'}</p>
      </div>
    );
  }

  return (
    <div className="mobile-resume-list">
      {filteredResumes.map((resume) => (
        <div key={resume.id} className="mobile-resume-card">
          <div className="resume-card-header" onClick={() => onEditResume(resume)}>
            <h3 className="resume-name">{getDisplayName(resume)}</h3>
            <div className="resume-meta">
              <span className="user-profile">
                {resume.user_profile?.full_name || 'Default Profile'}
              </span>
              <span className="update-date">
                Updated {formatDate(resume.updated_at)}
              </span>
            </div>
          </div>
          
          <div className="resume-card-actions">
            <button 
              className="action-btn edit-btn"
              onClick={() => onEditResume(resume)}
              title="Edit Resume"
            >
              <span className="btn-icon">✏️</span>
              Edit
            </button>
            
            <button 
              className="action-btn download-btn"
              onClick={() => onDownloadPdf(resume.id)}
              title="Download PDF"
            >
              <span className="btn-icon">⬇️</span>
              PDF
            </button>
            
            <button 
              className="action-btn delete-btn"
              onClick={() => onDeleteResume(resume.id)}
              title="Delete Resume"
            >
              <span className="btn-icon">🗑️</span>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MobileResumeList;