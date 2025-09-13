import React, { useState, useEffect, useRef } from 'react';
import './InlineEdit.css';

function InlineEdit({ 
  value, 
  onSave, 
  placeholder = "Click to edit",
  className = "",
  maxLength = 100,
  disabled = false 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    if (trimmedValue !== (value || '')) {
      try {
        await onSave(trimmedValue);
      } catch (error) {
        // Reset to original value on error
        setEditValue(value || '');
      }
    }
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (disabled) {
    return <span className={className}>{value || placeholder}</span>;
  }

  return (
    <div className={`inline-edit ${className}`}>
      {isEditing ? (
        <div className="inline-edit-input-container">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            className="inline-edit-input"
            placeholder={placeholder}
          />
          <div className="inline-edit-hint">
            Press Enter to save, Escape to cancel
          </div>
        </div>
      ) : (
        <span 
          className="inline-edit-display" 
          onClick={() => setIsEditing(true)}
          title="Click to edit"
        >
          {value || placeholder}
          <svg className="edit-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor">
            <path d="M11.013 2.5a1.75 1.75 0 1 1 2.475 2.475L8.5 9.963l-2.5.5.5-2.5 4.988-4.988Z"/>
          </svg>
        </span>
      )}
    </div>
  );
}

export default InlineEdit;