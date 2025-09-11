import React, { useState } from 'react';
import { api } from '../lib/api';
import { useToast } from './Toast';
import Modal from './Modal';
import './MediaGallery.css';

function MediaGallery({ media = [], onDelete, showCaptions = false }) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;

    setDeleting(mediaId);
    try {
      const { response } = await api.json(`/api/media/${mediaId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Media deleted successfully');
        if (onDelete) onDelete(mediaId);
      } else {
        toast.error('Failed to delete media');
      }
    } catch (error) {
      toast.error('Delete failed: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="media-gallery">
      {media.length > 0 && (
        <div className="gallery-section">
          <h4 className="gallery-title">Images</h4>
          <div className="image-grid">
            {media.map(item => (
              <div key={item.id} className="media-item">
                <div className="media-thumbnail" onClick={() => setLightbox(item)}>
                  <img 
                    src={item.preview_url || item.url} 
                    alt={item.caption || 'Media'} 
                    loading="lazy"
                  />
                  <div className="media-overlay">
                    <svg className="zoom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                      <path d="M11 8v6M8 11h6" />
                    </svg>
                  </div>
                </div>
                {showCaptions && item.caption && (
                  <p className="media-caption">{item.caption}</p>
                )}
                <div className="media-actions">
                  <button 
                    className="btn-icon"
                    onClick={() => window.open(item.url, '_blank')}
                    title="View full size"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  <button 
                    className="btn-icon btn-icon-danger"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length === 0 && (
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="empty-text">No media uploaded yet</p>
        </div>
      )}

      {lightbox && (
        <Modal
          isOpen={true}
          onClose={() => setLightbox(null)}
          className="lightbox-modal"
        >
          <div className="lightbox-content">
            <img 
              src={lightbox.url} 
              alt={lightbox.caption || 'Media'} 
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            />
            {lightbox.caption && (
              <p style={{ 
                marginTop: 'var(--space-md)', 
                color: 'var(--text-primary)',
                textAlign: 'center'
              }}>
                {lightbox.caption}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MediaGallery;