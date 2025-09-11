import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import './MediaPicker.css';

function MediaPicker({ value, onChange }) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);

  const backendBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8001';
  const toAbsolute = (uri) => {
    if (!uri) return uri;
    if (uri.startsWith('http')) return uri;
    if (uri.startsWith('/static/')) return `${backendBase}${uri}`;
    return uri;
  };

  const reload = async () => {
    try {
      const { response, data } = await api.json('/api/media');
      if (response.ok) {
        setItems(data || []);
      } else {
        console.error('MediaPicker API failed:', response.status, data);
      }
    } catch (error) {
      console.error('MediaPicker API error:', error);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
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


