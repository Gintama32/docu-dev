import React, { useState, useMemo } from 'react';
import './UnifiedTable.css';

function ExperienceSelectionTab({
  allExperiences,
  selectedExperiences,
  handleExperienceSelection,
  clients,
  userProfiles = [],
  selectedUserProfileId,
  onUserProfileChange,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  // Removed viewMode - always use table view

  // Get all unique tags from experiences
  const allTags = useMemo(() => {
    const tags = new Set();
    allExperiences.forEach(exp => {
      if (exp.tags) {
        exp.tags.split(',').forEach(tag => tags.add(tag.trim()));
      }
    });
    return Array.from(tags).sort();
  }, [allExperiences]);

  // Filter experiences based on search and filters
  const filteredExperiences = useMemo(() => {
    return allExperiences.filter(exp => {
      const matchesSearch = !searchTerm || 
        exp.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.project_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClient = !selectedClient || exp.client_id === parseInt(selectedClient);
      
      const matchesTag = !selectedTag || 
        (exp.tags && exp.tags.split(',').some(tag => tag.trim() === selectedTag));
      
      return matchesSearch && matchesClient && matchesTag;
    });
  }, [allExperiences, searchTerm, selectedClient, selectedTag]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatValue = (value) => {
    if (!value) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="experience-selection-section">
      <div className="section-header">
        <div className="header-content">
          <div className="header-text">
            <h3>Select Experiences for Resume</h3>
            <p>Choose relevant experiences to include in your resume. Use filters to find specific projects.</p>
          </div>
        </div>
      </div>

      {/* User Profile Selection - Condensed */}
      {userProfiles && userProfiles.length > 0 && (
        <div className="profile-selection-compact">
          <label className="profile-selection-label">
            Resume Profile:
            <select
              value={selectedUserProfileId || ''}
              onChange={(e) => onUserProfileChange?.(e.target.value)}
              className="profile-select-compact"
            >
              <option value="">Default Profile</option>
              {userProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.first_name + ' ' + profile.last_name || `Profile #${profile.id}`}
                </option>
              ))}
            </select>
          </label>
          <small className="profile-help">Choose which profile's personal info to use for this resume</small>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="filter-controls">
        <div className="search-input">
          <input
            type="text"
            placeholder="Search projects, descriptions, or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-field"
          />
        </div>
        
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="client-filter">Filter by Client:</label>
            <select
              id="client-filter"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="filter-select"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.client_name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="tag-filter">Filter by Tag:</label>
            <select
              id="tag-filter"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="filter-select"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || selectedClient || selectedTag) && (
            <button
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setSelectedClient('');
                setSelectedTag('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Experience Table */}
      {filteredExperiences.length === 0 ? (
        <div className="no-experiences">
          {allExperiences.length === 0 ? (
            <p>No experiences available. Please add some experiences first.</p>
          ) : (
            <p>No experiences match your current filters. Try adjusting your search criteria.</p>
          )}
        </div>
      ) : (
        <div className="unified-table-container">
          <table className="unified-table">
            <thead>
              <tr>
                <th className="checkbox-col">Select</th>
                <th className="project-col">Project & Description</th>
                <th className="details-col">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredExperiences.map((exp) => (
                <tr 
                  key={exp.id} 
                  className={`experience-row ${selectedExperiences.includes(exp.id) ? 'selected' : ''}`}
                >
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      id={`exp-table-${exp.id}`}
                      checked={selectedExperiences.includes(exp.id)}
                      onChange={() => handleExperienceSelection(exp.id)}
                      className="experience-checkbox"
                    />
                  </td>
                  <td className="project-cell">
                    <div className="project-info-expanded">
                      <div className="project-name">{exp.project_name}</div>
                      <div className="project-description-full">
                        {exp.project_description}
                      </div>
                      <div className="project-metadata">
                        {(exp.date_started || exp.date_completed) && (
                          <span className="duration-inline">
                            📅 {formatDate(exp.date_started)} - {formatDate(exp.date_completed)}
                          </span>
                        )}
                        {exp.tags && (
                          <div className="tags-inline">
                            🏷️ {exp.tags.split(',').slice(0, 3).map((tag, index) => (
                              <span key={index} className="tag-pill-inline">
                                {tag.trim()}
                              </span>
                            ))}
                            {exp.tags.split(',').length > 3 && (
                              <span className="tag-more-inline">+{exp.tags.split(',').length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="details-cell">
                    <div className="consolidated-details">
                      {clients.find(c => c.id === exp.client_id)?.client_name && (
                        <div className="detail-row">
                          <span className="detail-label">Client:</span> {clients.find(c => c.id === exp.client_id)?.client_name}
                        </div>
                      )}
                      {exp.location && (
                        <div className="detail-row">
                          <span className="detail-label">Location:</span> {exp.location}
                        </div>
                      )}
                      {exp.project_value && (
                        <div className="detail-row">
                          <span className="detail-label">Value:</span> {formatValue(exp.project_value)}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-section">
        <div className="selection-summary">
          {selectedExperiences.length > 0 && (
            <p>{selectedExperiences.length} experience{selectedExperiences.length === 1 ? '' : 's'} selected</p>
          )}
        </div>
        <p className="selection-instructions">
          ✅ Experiences are automatically saved to your resume when selected. Go to "Personalize Content" to customize descriptions, or "View/Edit Resume" to generate the final content.
        </p>
      </div>
    </div>
  );
}

export default ExperienceSelectionTab;