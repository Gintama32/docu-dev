import React, { useState } from 'react';

function CertificationsSection({ profile, onUpdate, onSave }) {
  const [certifications, setCertifications] = useState(profile?.certifications || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    acquired_date: '',
    valid_until: '',
    credential_id: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      issuer: '',
      acquired_date: '',
      valid_until: '',
      credential_id: ''
    });
    setEditingIndex(null);
    setShowAddForm(false);
  };

  const handleAddCertification = () => {
    if (!formData.name.trim()) return;
    
    const newCert = {
      name: formData.name.trim(),
      issuer: formData.issuer.trim() || null,
      acquired_date: formData.acquired_date || null,
      valid_until: formData.valid_until || null,
      credential_id: formData.credential_id.trim() || null
    };

    let updatedCertifications;
    if (editingIndex !== null) {
      updatedCertifications = [...certifications];
      updatedCertifications[editingIndex] = newCert;
    } else {
      updatedCertifications = [...certifications, newCert];
    }

    setCertifications(updatedCertifications);
    onUpdate({ certifications: updatedCertifications });
    resetForm();
  };

  const handleEditCertification = (index) => {
    const cert = certifications[index];
    setFormData({
      name: cert.name,
      issuer: cert.issuer || '',
      acquired_date: cert.acquired_date || '',
      valid_until: cert.valid_until || '',
      credential_id: cert.credential_id || ''
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDeleteCertification = (index) => {
    const updatedCertifications = certifications.filter((_, i) => i !== index);
    setCertifications(updatedCertifications);
    onUpdate({ certifications: updatedCertifications });
  };

  const handleSave = async () => {
    try {
      await onSave({ certifications });
    } catch (err) {
      // Error handled in parent
    }
  };

  const isExpired = (validUntil) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="header-content">
          <div className="header-text">
            <h3>Certifications</h3>
            <p>Professional certifications and achievements</p>
          </div>
          <div className="header-actions">
            <button 
              className="button-secondary"
              onClick={() => setShowAddForm(true)}
            >
              Add Certification
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
            <h4>{editingIndex !== null ? 'Edit Certification' : 'Add New Certification'}</h4>
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Certification Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="AWS Solutions Architect Associate"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Issuing Organization</label>
                  <input
                    type="text"
                    value={formData.issuer}
                    onChange={(e) => setFormData({...formData, issuer: e.target.value})}
                    placeholder="Amazon Web Services"
                  />
                </div>
                <div className="form-group">
                  <label>Credential ID</label>
                  <input
                    type="text"
                    value={formData.credential_id}
                    onChange={(e) => setFormData({...formData, credential_id: e.target.value})}
                    placeholder="AWS-SAA-123456"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date Acquired</label>
                  <input
                    type="date"
                    value={formData.acquired_date}
                    onChange={(e) => setFormData({...formData, acquired_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Valid Until</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                  />
                  <small className="form-help">Leave blank if certification doesn't expire</small>
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
                  onClick={handleAddCertification}
                  disabled={!formData.name.trim()}
                >
                  {editingIndex !== null ? 'Update' : 'Add'} Certification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Certifications Display */}
        <div className="certifications-container">
          {certifications.length === 0 ? (
            <div className="empty-state">
              <p>No certifications added yet. Click "Add Certification" to get started.</p>
            </div>
          ) : (
            <div className="certifications-grid">
              {certifications.map((cert, index) => (
                <div key={index} className="certification-card">
                  <div className="cert-header">
                    <h5 className="cert-name">{cert.name}</h5>
                    <div className="cert-actions">
                      <button 
                        className="cert-action-btn"
                        onClick={() => handleEditCertification(index)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="cert-action-btn"
                        onClick={() => handleDeleteCertification(index)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  {cert.issuer && (
                    <div className="cert-issuer">{cert.issuer}</div>
                  )}
                  
                  <div className="cert-details">
                    {cert.acquired_date && (
                      <div className="cert-date">
                        <span className="date-label">Acquired:</span> {formatDate(cert.acquired_date)}
                      </div>
                    )}
                    {cert.valid_until && (
                      <div className={`cert-expiry ${isExpired(cert.valid_until) ? 'expired' : ''}`}>
                        <span className="date-label">
                          {isExpired(cert.valid_until) ? 'Expired:' : 'Valid until:'}
                        </span> {formatDate(cert.valid_until)}
                      </div>
                    )}
                    {cert.credential_id && (
                      <div className="cert-id">
                        <span className="id-label">ID:</span> {cert.credential_id}
                      </div>
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

export default CertificationsSection;

