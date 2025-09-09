import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

function ExperiencesSection({ profile: _profile, onUpdate: _onUpdate, onSave: _onSave, profileId }) {
  const [experiences, setExperiences] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    position: '',
    experience_start: '',
    experience_end: '',
    experience_detail: '',
    is_current: false
  });

  useEffect(() => {
    if (profileId) {
      loadExperiences();
    }
  }, [profileId]);

  const loadExperiences = async () => {
    if (!profileId) return;
    
    try {
      const { response, data } = await api.json(`/api/user-profiles/${profileId}/experiences`);
      if (response.ok) {
        setExperiences(data || []);
      }
    } catch (err) {
      console.error('Error loading experiences:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      position: '',
      experience_start: '',
      experience_end: '',
      experience_detail: '',
      is_current: false
    });
    setEditingExperience(null);
    setShowAddForm(false);
  };

  const handleSaveExperience = async () => {
    if (!formData.company_name.trim() || !formData.position.trim()) return;
    
    try {
      const experienceData = {
        ...formData,
        experience_end: formData.is_current ? null : formData.experience_end
      };

      let response;
      if (editingExperience) {
        response = await api.json(
          `/api/user-profiles/${profileId}/experiences/${editingExperience.id}`, 
          {
            method: 'PUT',
            body: JSON.stringify(experienceData)
          }
        );
      } else {
        response = await api.json(
          `/api/user-profiles/${profileId}/experiences`, 
          {
            method: 'POST',
            body: JSON.stringify(experienceData)
          }
        );
      }

      if (response.response.ok) {
        loadExperiences(); // Reload the list
        resetForm();
      }
    } catch (err) {
      console.error('Error saving experience:', err);
    }
  };

  const handleEditExperience = (experience) => {
    setFormData({
      company_name: experience.company_name || '',
      position: experience.position || '',
      experience_start: experience.experience_start || '',
      experience_end: experience.experience_end || '',
      experience_detail: experience.experience_detail || '',
      is_current: experience.is_current || false
    });
    setEditingExperience(experience);
    setShowAddForm(true);
  };

  const handleDeleteExperience = async (experienceId) => {
    try {
      const response = await api.request(
        `/api/user-profiles/${profileId}/experiences/${experienceId}`, 
        { method: 'DELETE' }
      );
      if (response.ok) {
        loadExperiences(); // Reload the list
      }
    } catch (err) {
      console.error('Error deleting experience:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  const calculateDuration = (start, end, isCurrent) => {
    if (!start) return '';
    
    const startDate = new Date(start);
    const endDate = isCurrent ? new Date() : new Date(end);
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                  (endDate.getMonth() - startDate.getMonth());
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    } else if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years}y ${remainingMonths}m`;
    }
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="header-content">
          <div className="header-text">
            <h3>Work Experience</h3>
            <p>Professional work history and achievements</p>
          </div>
          <div className="header-actions">
            <button 
              className="button-secondary"
              onClick={() => setShowAddForm(true)}
              disabled={!profileId}
            >
              Add Experience
            </button>
          </div>
        </div>
      </div>

      <div className="section-content">
        {!profileId && (
          <div className="info-message">
            <p>Save the profile first to add work experiences.</p>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && profileId && (
          <div className="add-form">
            <h4>{editingExperience ? 'Edit Experience' : 'Add New Experience'}</h4>
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Tech Corp Inc."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Position *</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    placeholder="Senior Software Engineer"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.experience_start}
                    onChange={(e) => setFormData({...formData, experience_start: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.experience_end}
                    onChange={(e) => setFormData({...formData, experience_end: e.target.value})}
                    disabled={formData.is_current}
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_current}
                      onChange={(e) => setFormData({...formData, is_current: e.target.checked})}
                    />
                    <span>Current position</span>
                  </label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Job Description</label>
                  <textarea
                    value={formData.experience_detail}
                    onChange={(e) => setFormData({...formData, experience_detail: e.target.value})}
                    placeholder="Key responsibilities, achievements, and technologies used..."
                    rows={4}
                  />
                  <small className="form-help">
                    Describe your key responsibilities and achievements in this role
                  </small>
                </div>
              </div>
              <div className="form-actions">
                <button 
                  className="button-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button 
                  className="button-primary"
                  onClick={handleSaveExperience}
                  disabled={!formData.company_name.trim() || !formData.position.trim()}
                >
                  {editingExperience ? 'Update' : 'Add'} Experience
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Experiences Display */}
        <div className="experiences-container">
          {experiences.length === 0 ? (
            <div className="empty-state">
              <p>No work experience added yet. {profileId ? 'Click "Add Experience" to get started.' : 'Save the profile first to add experiences.'}</p>
            </div>
          ) : (
            <div className="experiences-timeline">
              {experiences.map((exp, index) => (
                <div key={exp.id} className="experience-card">
                  <div className="exp-header">
                    <div className="exp-main">
                      <h5 className="exp-position">{exp.position}</h5>
                      <div className="exp-company">{exp.company_name}</div>
                    </div>
                    <div className="exp-actions">
                      <button 
                        className="exp-action-btn"
                        onClick={() => handleEditExperience(exp)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="exp-action-btn"
                        onClick={() => handleDeleteExperience(exp.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="exp-timeline">
                    <div className="exp-dates">
                      <span className="start-date">{formatDate(exp.experience_start)}</span>
                      <span className="date-separator">—</span>
                      <span className="end-date">
                        {exp.is_current ? 'Present' : formatDate(exp.experience_end)}
                      </span>
                    </div>
                    <div className="exp-duration">
                      {calculateDuration(exp.experience_start, exp.experience_end, exp.is_current)}
                    </div>
                  </div>
                  
                  {exp.experience_detail && (
                    <div className="exp-description">
                      {exp.experience_detail.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExperiencesSection;

