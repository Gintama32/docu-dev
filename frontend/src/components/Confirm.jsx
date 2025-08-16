import React from 'react';
import Modal from './Modal';

function Confirm({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <Modal onClose={onCancel} className="structured-modal">
      <div className="modal-header">
        <h2>{title}</h2>
      </div>
      <div className="modal-body">
        {message && <p>{message}</p>}
      </div>
      <div className="modal-footer">
        <div className="modal-actions">
          <button className="button-secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={destructive ? 'button-danger' : 'button-primary'}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default Confirm;
