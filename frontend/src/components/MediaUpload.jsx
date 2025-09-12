import React, { useState } from 'react';
import { api } from '../lib/api';
import { useToast } from './Toast';
import './MediaUpload.css';

function MediaUpload({ 
  onUploadComplete, 
  entityType, 
  entityId, 
  mediaType = 'general',  // Media category: 'project', 'profile', 'general'
  attachmentType = 'attachment',  // Association type: 'attachment', 'avatar', etc.
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024 // 10MB
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);

  const validateFile = (file) => {
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
      return false;
    }

    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const fileType = file.type;

    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type;
      }
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.slice(0, -2));
      }
      return fileType === type;
    });

    if (!isAccepted) {
      toast.error('File type not allowed');
      return false;
    }

    return true;
  };

  const handleFile = async (file) => {
    if (!validateFile(file)) return;

    // Show preview for image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview({ url: e.target.result, type: 'image' });
      reader.readAsDataURL(file);
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (entityType) formData.append('entity_type', entityType);
      if (entityId) formData.append('entity_id', entityId);
      formData.append('media_type', mediaType);  // Category: project/profile/general
      formData.append('attachment_type', attachmentType);  // Association type

      const { response, data } = await api.json('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success('File uploaded successfully');
        if (onUploadComplete) {
          onUploadComplete(data);
        }
        setPreview(null);
      } else {
        toast.error(data.detail || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="media-upload">
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="preview-container">
            <img src={preview.url} alt="Preview" className="preview-image" />
            {!uploading && (
              <button 
                className="btn btn-secondary preview-remove"
                onClick={() => setPreview(null)}
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <>
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="upload-text">
              {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
            </p>
            <p className="upload-hint">
              Supports images (PNG, JPG, GIF, WEBP) up to {maxSize / 1024 / 1024}MB
            </p>
          </>
        )}
        <input
          type="file"
          className="upload-input"
          accept={accept}
          onChange={handleChange}
          disabled={uploading}
        />
      </div>
    </div>
  );
}

export default MediaUpload;