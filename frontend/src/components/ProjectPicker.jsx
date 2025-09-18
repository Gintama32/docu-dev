import React, { useState, useMemo } from 'react';
import './ProjectPicker.css';

function ProjectPicker({ 
  projects = [], 
  clients = [], 
  value, 
  onChange, 
  placeholder = "Search and select a project..."
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.client_name : null;
  };

  const formatCurrency = (value) => {
    return value ? `$${value.toLocaleString()}` : null;
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : null;
  };

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    
    const term = searchTerm.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(term) ||
      (project.description && project.description.toLowerCase().includes(term)) ||
      (project.location && project.location.toLowerCase().includes(term)) ||
      (project.client_id && getClientName(project.client_id)?.toLowerCase().includes(term))
    );
  }, [projects, searchTerm, clients]);

  const selectedProject = projects.find(p => p.id === value);

  const handleSelect = (project) => {
    onChange(project.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  return (
    <div className="project-picker">
      <div className="picker-input-container">
        <input
          type="text"
          className="picker-search-input"
          value={selectedProject ? selectedProject.name : searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
        />
        
        {selectedProject && (
          <button 
            className="clear-selection-btn"
            onClick={() => {
              onChange(null);
              setSearchTerm('');
            }}
            title="Clear selection"
          >
            ✕
          </button>
        )}
        
        <button 
          className="dropdown-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          ▼
        </button>
      </div>

      {selectedProject && !isOpen && (
        <div className="selected-project-preview">
          <div className="project-card selected">
            <div className="project-main-info">
              <h4>{selectedProject.name}</h4>
              {selectedProject.description && (
                <p className="project-description">
                  {selectedProject.description.length > 100 ? 
                    `${selectedProject.description.substring(0, 100)}...` : 
                    selectedProject.description
                  }
                </p>
              )}
            </div>
            <div className="project-meta">
              {getClientName(selectedProject.client_id) && (
                <span className="meta-item">🏢 {getClientName(selectedProject.client_id)}</span>
              )}
              {formatDate(selectedProject.date) && (
                <span className="meta-item">📅 {formatDate(selectedProject.date)}</span>
              )}
              {formatCurrency(selectedProject.contract_value) && (
                <span className="meta-item">💰 {formatCurrency(selectedProject.contract_value)}</span>
              )}
              {selectedProject.location && (
                <span className="meta-item">📍 {selectedProject.location}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="project-dropdown">
          <div className="dropdown-header">
            <span>Select a project ({filteredProjects.length} found)</span>
            <button 
              className="close-dropdown"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="project-list">
            {filteredProjects.length === 0 ? (
              <div className="no-results">
                <p>No projects found matching "{searchTerm}"</p>
                <p>Try a different search term.</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  className={`project-card ${value === project.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(project)}
                >
                  <div className="project-main-info">
                    <h4>{project.name}</h4>
                    <div className="project-meta">
                      {getClientName(project.client_id) && (
                        <span className="meta-item">🏢 {getClientName(project.client_id)}</span>
                      )}
                      {formatDate(project.date) && (
                        <span className="meta-item">📅 {formatDate(project.date)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectPicker;