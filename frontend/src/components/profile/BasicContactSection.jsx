import React, { useState, useEffect } from 'react';
import { useToast } from '../Toast';
import MediaPicker from '../MediaPicker';
import MediaUpload from '../MediaUpload';
import MediaGallery from '../MediaGallery';
import { api } from '../../lib/api';

function BasicContactSection({ profile, onUpdate, onSave: _onSave }) {
  const toast = useToast();
  const [localData, setLocalData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    full_name: profile?.full_name || '',
    current_title: profile?.current_title || '',
    department: profile?.department || '',
    employee_type: profile?.employee_type || 'full-time',
    is_current_employee: profile?.is_current_employee ?? true,
    professional_intro: profile?.professional_intro || '',
    email: profile?.email || '',
    mobile: profile?.mobile || '',
    address: profile?.address || '',
    about_url: profile?.about_url || '',
    main_image_id: profile?.main_image_id || null
  });
  
  const [media, setMedia] = useState([]);

  // Load profile media when profile changes
  useEffect(() => {
    if (profile?.id) {
      loadProfileMedia();
    }
  }, [profile?.id]);

  const loadProfileMedia = async () => {
    if (!profile?.id) return;
    
    try {
      const { response, data } = await api.json(`/api/media/profiles/${profile.id}`);
      if (response.ok) {
        setMedia(data || []);
      }
    } catch (error) {
      // Silently handle errors
    }
  };

  const handleUploadComplete = (uploadedMedia) => {
    setMedia(prev => [uploadedMedia, ...prev]);
    toast.success('Media uploaded successfully!');
  };

  const handleMediaDelete = (mediaId) => {
    setMedia(prev => prev.filter(m => m.id !== mediaId));
    // If this was the main image, clear it
    if (localData.main_image_id === mediaId) {
      handleChange('main_image_id', null);
    }
  };

  const handleChange = (field, value) => {
    const updated = { ...localData, [field]: value };
    
    // Auto-generate full name
    if (field === 'first_name' || field === 'last_name') {
      updated.full_name = `${updated.first_name} ${updated.last_name}`.trim();
    }
    
    setLocalData(updated);
    onUpdate(updated);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getCharCountClass = (count) => {
    if (count >= 150 && count <= 300) return 'optimal';
    if (count > 300 && count <= 500) return 'warning';
    if (count > 500) return 'over';
    return '';
  };

  return (
    <div className="section-content">
      <div className="form-grid">
        {/* Names */}
        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              value={localData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              placeholder="John"
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              value={localData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              placeholder="Doe"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={localData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="Auto-generated from first and last name"
            />
            <small className="form-help">
              Leave blank to auto-generate from first and last name
            </small>
          </div>
        </div>

        {/* Professional Info */}
        <div className="form-row">
          <div className="form-group">
            <label>Current Title</label>
            <input
              type="text"
              value={localData.current_title}
              onChange={(e) => handleChange('current_title', e.target.value)}
              placeholder="Marketing Manager, Project Manager, etc."
            />
          </div>
          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              value={localData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="Administration, Marketing, etc."
            />
          </div>
        </div>

        {/* Employment Details */}
        <div className="form-row">
          <div className="form-group">
            <label>Employment Type</label>
            <select
              value={localData.employee_type}
              onChange={(e) => handleChange('employee_type', e.target.value)}
            >
              <option value="full-time">Full-time</option>
              <option value="contract">Contract</option>
              <option value="consultant">Consultant</option>
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
            <label className="checkbox-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={localData.is_current_employee}
                onChange={(e) => handleChange('is_current_employee', e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              Currently employed
            </label>
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={localData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john.doe@company.com"
              className={localData.email && !validateEmail(localData.email) ? 'error' : ''}
            />
            {localData.email && !validateEmail(localData.email) && (
            <small className="form-error">Please enter a valid email address</small>
              )}
          </div>
          <div className="form-group">
            <label>Mobile Phone</label>
            <input
              type="tel"
              value={localData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
              placeholder="+1-555-0123"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              value={localData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="San Francisco, CA"
            />
            <small className="form-help">
              City, State/Country - keep it general for privacy
            </small>
          </div>
          <div className="form-group">
            <label>Portfolio/Website URL</label>
            <input
              type="url"
              value={localData.about_url}
              onChange={(e) => handleChange('about_url', e.target.value)}
              placeholder="https://yourportfolio.com"
              className={localData.about_url && !validateUrl(localData.about_url) ? 'error' : ''}
            />
            {localData.about_url && !validateUrl(localData.about_url) && (
            <small className="form-error">Please enter a valid URL (include https://)</small>
              )}
            <small className="form-help">
              Link to your portfolio, LinkedIn, or professional website
            </small>
          </div>
        </div>

      </div>
      
      {/* Professional Introduction - Enhanced - Full Width - Outside form-grid */}
      <div className="professional-intro-section">
        <label className="professional-intro-label">
          <span className="label-text">Professional Introduction</span>
          <span className="label-badge">Key Section</span>
        </label>
        <div className="professional-intro-container">
          <textarea
            value={localData.professional_intro}
            onChange={(e) => handleChange('professional_intro', e.target.value)}
            placeholder="Craft your professional story here... Highlight your expertise, key achievements, and what makes you unique in your field. This introduction will be prominently featured on your resume and professional profiles."
            rows={6}
            className="professional-intro-textarea"
          />
          <div className="intro-stats">
            <span className={`char-count ${getCharCountClass(localData.professional_intro?.length || 0)}`}>
              {localData.professional_intro?.length || 0} characters
            </span>
            <span className="word-count">
              {localData.professional_intro?.split(/\s+/).filter(word => word.length > 0).length || 0} words
            </span>
          </div>
        </div>
        <div className="form-help-enhanced">
          <div className="help-title">💡 Tips for a compelling introduction:</div>
          <ul className="help-tips">
            <li>Start with your current role and years of experience</li>
            <li>Highlight 2-3 key areas of expertise</li>
            <li>Mention notable achievements or impact</li>
            <li>Keep it concise but impactful (150-300 words ideal)</li>
          </ul>
        </div>
      </div>

      {/* Profile Media Section */}
      <div className="media-section" style={{ marginTop: 'var(--space-lg)' }}>
        <h3>Profile Media</h3>
        
        {/* Main Profile Image Selection */}
        <div className="form-group">
          <label>Main Profile Image</label>
          <MediaPicker 
            value={localData.main_image_id} 
            onChange={(id) => handleChange('main_image_id', id)} 
          />
          <small className="form-help">
            This image will be used as your profile photo in resumes and personnel listings
          </small>
        </div>

        {/* Upload New Media */}
        {profile?.id && (
          <div className="form-group">
            <label>Upload New Media</label>
            <MediaUpload
              onUploadComplete={handleUploadComplete}
              entityType="profile"
              entityId={profile.id}
              mediaType="avatar"
              accept="image/*"
            />
          </div>
        )}

        {/* Media Gallery */}
        {media.length > 0 && (
          <div className="form-group">
            <label>Profile Media Gallery</label>
            <MediaGallery
              media={media}
              onDelete={handleMediaDelete}
              showCaptions={false}
            />
          </div>
        )}

        {profile?.id && media.length === 0 && (
          <div style={{ 
            padding: 'var(--space-md)', 
            textAlign: 'center', 
            color: 'var(--text-secondary)',
            fontStyle: 'italic' 
          }}>
            No media uploaded yet. Use the upload area above to add profile images.
          </div>
        )}
      </div>
    </div>
  );
}

export default BasicContactSection;
