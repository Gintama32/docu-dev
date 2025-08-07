import React from 'react';
import './Modal.css';

function Modal({ children, onClose, className = '' }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
        <button className="modal-close-button" onClick={onClose}>&times;</button>
      </div>
    </div>
  );
}

export default Modal;