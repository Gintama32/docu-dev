import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../lib/api';

function ResumeListTab({ 
  resumes, 
  onSelectResume, 
  onCreateNewResume,
  onDeleteResume,
  selectedProposal,
  clients 
}) {
  const [showCreateResumeModal, setShowCreateResumeModal] = useState(false);
  const [newResumeAlias, setNewResumeAlias] = useState('');
  const [userProfiles, setUserProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const handleCreateResume = (e) => {
    e.preventDefault();
    onCreateNewResume(newResumeAlias, selectedProfileId ? Number(selectedProfileId) : null, selectedTemplateId ? Number(selectedTemplateId) : null);
    setNewResumeAlias('');
    setShowCreateResumeModal(false);
  };

  const getDisplayName = (resume, index) => {
    return resume.alias || `Resume #${index + 1}`;
  };

  useEffect(() => {
    if (!showCreateResumeModal) return;
    (async () => {
      try {
        const [profilesRes, templatesRes, defaultTplRes] = await Promise.all([
          api.json('/api/user-profiles?only_mine=true'),
          api.json('/api/templates'),
          api.json('/api/templates/default')
        ]);
        if (profilesRes.response.ok) {
          const profs = profilesRes.data || [];
          setUserProfiles(profs);
          if (profs.length > 0) setSelectedProfileId(String(profs[0].id));
        }
        let temps = [];
        if (templatesRes.response.ok) temps = templatesRes.data || [];
        if (defaultTplRes.response?.ok && defaultTplRes.data) {
          const def = defaultTplRes.data;
          if (!temps.find(t => t.id === def.id)) temps.unshift(def);
        }
        setTemplates(temps);
        if (temps.length > 0) setSelectedTemplateId(String(temps[0].id));
      } catch (e) {
        // ignore
      }
    })();
  }, [showCreateResumeModal]);

  return (
    <div className="resume-list-tab">
      <div className="resume-list-header">
        <h3>Resumes for {selectedProposal?.name}</h3>
        <button 
          className="button-primary" 
          onClick={() => setShowCreateResumeModal(true)}
        >
          Create New Resume
        </button>
      </div>

      {resumes.length === 0 ? (
        <div className="empty-state">
          <h4>No resumes created yet</h4>
          <p>Create your first resume for this proposal to get started.</p>
          <button 
            className="button-primary" 
            onClick={() => setShowCreateResumeModal(true)}
          >
            Create New Resume
          </button>
        </div>
      ) : (
        <div className="resume-cards-grid">
          {resumes.map((resume, index) => (
            <div key={resume.id} className="resume-card">
              <div className="resume-card-header">
                <h4>{getDisplayName(resume, index)}</h4>
                <span className={`resume-status ${resume.status?.toLowerCase()}`}>
                  {resume.status || 'Draft'}
                </span>
              </div>
              <div className="resume-card-body">
                <p className="resume-meta">
                  <strong>Created:</strong> {new Date(resume.created_at).toLocaleDateString()}
                </p>
                {resume.updated_at && (
                  <p className="resume-meta">
                    <strong>Last Updated:</strong> {new Date(resume.updated_at).toLocaleDateString()}
                  </p>
                )}
                <p className="resume-meta">
                  <strong>Template:</strong> {resume.template_id ? `Template ${resume.template_id}` : 'Default'}
                </p>
                {resume.experience_ids && (
                  <p className="resume-meta">
                    <strong>Experiences:</strong> {resume.experience_ids.length} selected
                  </p>
                )}
              </div>
              <div className="resume-card-actions">
                <button 
                  className="button-primary" 
                  onClick={() => onSelectResume(resume)}
                >
                  Open Resume
                </button>
                <button 
                  className="button-danger" 
                  onClick={() => onDeleteResume(resume.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateResumeModal && (
        <Modal onClose={() => setShowCreateResumeModal(false)}>
          <form onSubmit={handleCreateResume} className="resume-form">
            <h3>Create New Resume</h3>
            <div className="form-group">
              <label>
                Resume Name (optional):
                <input
                  type="text"
                  value={newResumeAlias}
                  onChange={(e) => setNewResumeAlias(e.target.value)}
                  placeholder="e.g., Senior Developer - TechCorp"
                />
              </label>
              <small className="form-help">
                Give your resume a meaningful name, or leave blank to auto-generate
              </small>
            </div>

            <div className="form-group">
              <label>User Profile</label>
              {userProfiles.length > 0 ? (
                <select value={selectedProfileId} onChange={(e)=>setSelectedProfileId(e.target.value)}>
                  <option value="">Select profile…</option>
                  {userProfiles.map(p => (
                    <option key={p.id} value={p.id}>Profile #{p.id}</option>
                  ))}
                </select>
              ) : (
                <div className="form-help">No profiles found. Create one under Personnel.</div>
              )}
            </div>

            <div className="form-group">
              <label>Template</label>
              {templates.length > 0 ? (
                <select value={selectedTemplateId} onChange={(e)=>setSelectedTemplateId(e.target.value)}>
                  <option value="">Default template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              ) : (
                <div className="form-help">Using default template.</div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="button-primary">Create Resume</button>
              <button 
                type="button" 
                className="button-secondary" 
                onClick={() => setShowCreateResumeModal(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default ResumeListTab;
