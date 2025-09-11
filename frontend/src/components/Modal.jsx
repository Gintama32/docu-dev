import React, { useEffect } from 'react';
import './Modal.css';

function Modal({ children, onClose, className = '' }) {
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
        <button className="modal-close-button" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

export default Modal;