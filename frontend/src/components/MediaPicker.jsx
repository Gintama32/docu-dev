import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import './MediaPicker.css';

function MediaPicker({ value, onChange, mediaType = null, showFilters = true, entityType = null, entityId = null }) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(mediaType || 'all');

  const backendBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8001';
  const toAbsolute = (uri) => {
    if (!uri) return uri;
    if (uri.startsWith('http')) return uri;
    if (uri.startsWith('/static/')) return `${backendBase}${uri}`;
    return uri;
  };

  const reload = async (filterType = selectedFilter) => {
    try {
      let endpoint = '/api/media';
      
      // If we're in a specific entity context, load associated media + all media of that type
      if (entityType && entityId) {
        // Load associated media for this entity
        const associatedEndpoint = entityType === 'profile' ? 
          `/api/media/profiles/${entityId}` : 
          `/api/media/projects/${entityId}`;
        
        const { response: assocResponse, data: assocData } = await api.json(associatedEndpoint);
        const associatedMedia = assocResponse.ok ? assocData || [] : [];
        
        // Also load all media of the specified type
        const queryParam = filterType && filterType !== 'all' ? `?media_type=${filterType}` : '';
        const { response, data } = await api.json(`/api/media${queryParam}`);
        const allMedia = response.ok ? data || [] : [];
        
        // Combine and deduplicate
        const mediaMap = new Map();
        [...associatedMedia, ...allMedia].forEach(item => {
          mediaMap.set(item.id, item);
        });
        setItems(Array.from(mediaMap.values()));
      } else {
        // Normal behavior - load all media with optional filter
        const queryParam = filterType && filterType !== 'all' ? `?media_type=${filterType}` : '';
        const { response, data } = await api.json(`/api/media${queryParam}`);
        if (response.ok) {
          setItems(data || []);
        }
      }
    } catch (error) {
      // Silently handle errors - don't expose API details
      setItems([]);
    }
  };

  useEffect(() => { 
    // Set initial filter based on mediaType prop
    if (mediaType && !showFilters) {
      setSelectedFilter(mediaType);
    }
    reload(); 
  }, [mediaType]);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('media_type', selectedFilter && selectedFilter !== 'all' ? selectedFilter : 'general');
      const res = await api.request('/api/media/upload', { method: 'POST', body: form });
      if (res.ok) {
        const media = await res.json();
        // refresh to keep list consistent
        await reload();
        if (onChange) onChange(media.id);
      } else {
        // noop; could surface error toast
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="media-picker">
      <div className="media-picker-header">
        <h4>Select Image</h4>
        <label className="button-secondary upload-button" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : 'Upload New'}
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      </div>
      
      {showFilters && (
        <div className="media-picker-filters">
          {['all', 'project', 'profile', 'general'].map((filter) => (
            <button
              key={filter}
              className={`filter-btn ${selectedFilter === filter ? 'active' : ''}`}
              onClick={() => {
                setSelectedFilter(filter);
                reload(filter);
              }}
            >
              {filter === 'all' ? 'All Images' : 
               filter === 'project' ? 'Project Images' :
               filter === 'profile' ? 'Profile Images' : 
               'General Images'}
            </button>
          ))}
        </div>
      )}
      
      {items.length > 0 ? (
        <div className="media-picker-grid">
          {items.map((item) => {
            const isSelected = value === item.id;
            const imageUrl = item.media_uri ? toAbsolute(item.media_uri) : `${backendBase}/api/media/${item.id}/raw`;
            
            return (
              <div 
                key={item.id}
                className={`media-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onChange && onChange(item.id)}
              >
                <div className="media-picker-thumbnail">
                  <img 
                    src={imageUrl} 
                    alt={item.original_filename || `Media ${item.id}`}
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="selection-indicator">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="media-picker-info">
                  <p className="media-filename">
                    {item.original_filename || `Media ${item.id}`}
                  </p>
                  <p className="media-dimensions">
                    {item.width && item.height ? `${item.width}×${item.height}` : item.format?.toUpperCase()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="media-picker-empty">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>No images available</p>
          <p>Upload your first image using the button above</p>
        </div>
      )}
      
      {value && (
        <div className="media-picker-actions">
          <button 
            className="button-tertiary clear-selection"
            onClick={() => onChange && onChange(null)}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
}

export default MediaPicker;


