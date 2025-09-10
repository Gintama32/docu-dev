import React, { useState, useEffect } from 'react';
import './ReorderModal.css';

const ReorderModal = ({ isOpen, onClose, experiences, onReorder }) => {
  const [orderedExperiences, setOrderedExperiences] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    if (isOpen && experiences) {
      // Sort experiences by current display_order and create reorder list
      const sorted = [...experiences].sort((a, b) => {
        const orderA = a.display_order || 0;
        const orderB = b.display_order || 0;
        return orderA - orderB;
      });
      setOrderedExperiences(sorted);
    }
  }, [isOpen, experiences]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newOrder = [...orderedExperiences];
    const draggedItem = newOrder[draggedIndex];
    
    // Remove dragged item
    newOrder.splice(draggedIndex, 1);
    
    // Insert at new position
    newOrder.splice(dropIndex, 0, draggedItem);
    
    setOrderedExperiences(newOrder);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    
    const newOrder = [...orderedExperiences];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrderedExperiences(newOrder);
  };

  const moveDown = (index) => {
    if (index === orderedExperiences.length - 1) return;
    
    const newOrder = [...orderedExperiences];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrderedExperiences(newOrder);
  };

  const handleSave = () => {
    // Create the new order with experience_ids and their new display_order
    const newOrder = orderedExperiences.map((exp, index) => ({
      experience_id: exp.experience_id,
      display_order: index
    }));
    
    onReorder(newOrder);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content reorder-modal structured-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Reorder Experiences</h2>
        </div>
        
        <div className="modal-body">
          <p>Drag experiences to reorder them, or use the arrow buttons. The first experience will appear first in your resume.</p>
          
          <div className="reorder-list">
            {orderedExperiences.map((exp, index) => (
              <div
                key={exp.experience_id}
                className={`reorder-item ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="drag-handle" title="Drag to reorder">
                  ⋮⋮
                </div>
                
                <div className="experience-info">
                  <div className="experience-name">
                    {exp.experience?.project_name || exp.project_name || 'Untitled Experience'}
                  </div>
                  <div className="experience-meta">
                    Position {index + 1} of {orderedExperiences.length}
                    {(exp.experience?.client || exp.client) && (
                      <span className="client-info">
                        • {exp.experience?.client?.client_name || exp.client?.client_name}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="reorder-controls">
                  <button
                    type="button"
                    className="reorder-btn"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="reorder-btn"
                    onClick={() => moveDown(index)}
                    disabled={index === orderedExperiences.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="modal-footer">
          <div className="modal-actions">
            <button 
              className="button-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              className="button-primary"
              onClick={handleSave}
            >
              Save Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReorderModal;
