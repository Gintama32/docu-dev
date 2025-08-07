import React, { useState, useMemo } from 'react';

function ExperienceSelectionTab({
  allExperiences,
  selectedExperiences,
  handleExperienceSelection,
  clients,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'cards' or 'table'

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
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card View"
            >
              ⊞
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

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

      {/* Experience Cards */}
      {filteredExperiences.length === 0 ? (
        <div className="no-experiences">
          {allExperiences.length === 0 ? (
            <p>No experiences available. Please add some experiences first.</p>
          ) : (
            <p>No experiences match your current filters. Try adjusting your search criteria.</p>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="experience-grid">
          {filteredExperiences.map((exp) => (
            <div key={exp.id} className={`experience-card ${selectedExperiences.includes(exp.id) ? 'selected' : ''}`}>
              <div className="card-header">
                <input
                  type="checkbox"
                  id={`exp-${exp.id}`}
                  checked={selectedExperiences.includes(exp.id)}
                  onChange={() => handleExperienceSelection(exp.id)}
                  className="experience-checkbox"
                />
                <label htmlFor={`exp-${exp.id}`} className="project-title">
                  {exp.project_name}
                </label>
              </div>

              <div className="card-content">
                <div className="project-description">
                  {exp.project_description}
                </div>

                <div className="project-meta">
                  <div className="meta-row">
                    <span className="meta-label">Client:</span>
                    <span className="meta-value">
                      {clients.find(c => c.id === exp.client_id)?.client_name || 'N/A'}
                    </span>
                  </div>

                  {(exp.date_started || exp.date_completed) && (
                    <div className="meta-row">
                      <span className="meta-label">Duration:</span>
                      <span className="meta-value">
                        {formatDate(exp.date_started)} - {formatDate(exp.date_completed)}
                      </span>
                    </div>
                  )}

                  {exp.location && (
                    <div className="meta-row">
                      <span className="meta-label">Location:</span>
                      <span className="meta-value">{exp.location}</span>
                    </div>
                  )}

                  {exp.project_value && (
                    <div className="meta-row">
                      <span className="meta-label">Value:</span>
                      <span className="meta-value project-value">{formatValue(exp.project_value)}</span>
                    </div>
                  )}

                  {exp.tags && (
                    <div className="meta-row">
                      <span className="meta-label">Tags:</span>
                      <div className="tags-list">
                        {exp.tags.split(',').map((tag, index) => (
                          <span key={index} className="tag-pill">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="experience-table-container">
          <table className="experience-table">
            <thead>
              <tr>
                <th className="checkbox-col">Select</th>
                <th className="project-col">Project & Description</th>
                <th className="client-col">Client</th>
                <th className="location-col">Location</th>
                <th className="value-col">Value</th>
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
                  <td className="client-cell">
                    {clients.find(c => c.id === exp.client_id)?.client_name || 'N/A'}
                  </td>
                  <td className="location-cell">
                    {exp.location || 'N/A'}
                  </td>
                  <td className="value-cell">
                    {exp.project_value ? formatValue(exp.project_value) : 'N/A'}
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