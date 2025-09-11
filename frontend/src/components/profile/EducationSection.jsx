import React, { useState } from 'react';

function EducationSection({ profile, onUpdate, onSave }) {
  const [education, setEducation] = useState(profile?.education || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    institution: '',
    degree: '',
    field: '',
    graduation_year: '',
    gpa: '',
    honors: ''
  });

  const resetForm = () => {
    setFormData({
      institution: '',
      degree: '',
      field: '',
      graduation_year: '',
      gpa: '',
      honors: ''
    });
    setEditingIndex(null);
    setShowAddForm(false);
  };

  const handleAddEducation = () => {
    if (!formData.institution.trim() || !formData.degree.trim()) return;
    
    const newEducation = {
      institution: formData.institution.trim(),
      degree: formData.degree.trim(),
      field: formData.field.trim() || null,
      graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
      gpa: formData.gpa ? parseFloat(formData.gpa) : null,
      honors: formData.honors.trim() || null
    };

    let updatedEducation;
    if (editingIndex !== null) {
      updatedEducation = [...education];
      updatedEducation[editingIndex] = newEducation;
    } else {
      updatedEducation = [...education, newEducation];
    }

    setEducation(updatedEducation);
    onUpdate({ education: updatedEducation });
    resetForm();
  };

  const handleEditEducation = (index) => {
    const edu = education[index];
    setFormData({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field || '',
      graduation_year: edu.graduation_year?.toString() || '',
      gpa: edu.gpa?.toString() || '',
      honors: edu.honors || ''
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDeleteEducation = (index) => {
    const updatedEducation = education.filter((_, i) => i !== index);
    setEducation(updatedEducation);
    onUpdate({ education: updatedEducation });
  };

  const handleSave = async () => {
    try {
      await onSave({ education });
    } catch (err) {
      // Error handled in parent
    }
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="header-content">
          <div className="header-text">
            <h3>Education</h3>
            <p>Academic background and qualifications</p>
          </div>
          <div className="header-actions">
            <button 
              className="button-secondary"
              onClick={() => setShowAddForm(true)}
            >
              Add Education
            </button>
            <button 
              className="button-primary"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="section-content">
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="add-form">
            <h4>{editingIndex !== null ? 'Edit Education' : 'Add Education'}</h4>
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label>Institution *</label>
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({...formData, institution: e.target.value})}
                    placeholder="University of California, Berkeley"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Degree *</label>
                  <input
                    type="text"
                    value={formData.degree}
                    onChange={(e) => setFormData({...formData, degree: e.target.value})}
                    placeholder="Bachelor of Science"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Field of Study</label>
                  <input
                    type="text"
                    value={formData.field}
                    onChange={(e) => setFormData({...formData, field: e.target.value})}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="form-group">
                  <label>Graduation Year</label>
                  <input
                    type="number"
                    min="1950"
                    max="2030"
                    value={formData.graduation_year}
                    onChange={(e) => setFormData({...formData, graduation_year: e.target.value})}
                    placeholder="2020"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>GPA</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.1"
                    value={formData.gpa}
                    onChange={(e) => setFormData({...formData, gpa: e.target.value})}
                    placeholder="3.8"
                  />
                  <small className="form-help">On a 4.0 scale</small>
                </div>
                <div className="form-group">
                  <label>Honors/Awards</label>
                  <input
                    type="text"
                    value={formData.honors}
                    onChange={(e) => setFormData({...formData, honors: e.target.value})}
                    placeholder="Magna Cum Laude"
                  />
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
                  onClick={handleAddEducation}
                  disabled={!formData.institution.trim() || !formData.degree.trim()}
                >
                  {editingIndex !== null ? 'Update' : 'Add'} Education
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Education Display */}
        <div className="education-container">
          {education.length === 0 ? (
            <div className="empty-state">
              <p>No education added yet. Click "Add Education" to get started.</p>
            </div>
          ) : (
            <div className="education-list">
              {education.map((edu, index) => (
                <div key={index} className="education-card">
                  <div className="edu-header">
                    <div className="edu-main">
                      <h5 className="edu-degree">{edu.degree}</h5>
                      <div className="edu-institution">{edu.institution}</div>
                    </div>
                    <div className="edu-actions">
                      <button 
                        className="edu-action-btn"
                        onClick={() => handleEditEducation(index)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="edu-action-btn"
                        onClick={() => handleDeleteEducation(index)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="edu-details">
                    {edu.field && (
                      <div className="edu-field">📚 {edu.field}</div>
                    )}
                    <div className="edu-meta">
                      {edu.graduation_year && (
                        <span className="edu-year">🎓 {edu.graduation_year}</span>
                      )}
                      {edu.gpa && (
                        <span className="edu-gpa">📊 GPA: {edu.gpa}</span>
                      )}
                    </div>
                    {edu.honors && (
                      <div className="edu-honors">🏆 {edu.honors}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EducationSection;



