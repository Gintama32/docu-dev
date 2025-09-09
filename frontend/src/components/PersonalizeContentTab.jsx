import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import ReorderModal from './ReorderModal';
import './PersonalizeContentTab.css';

const PersonalizeContentTab = ({ 
  resumeId, 
  experiences, 
  onSave, 
  onBack,
  onGenerateResume 
}) => {
  const [editedExperiences, setEditedExperiences] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [regenerateModalExp, setRegenerateModalExp] = useState(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [showReorderModal, setShowReorderModal] = useState(false);
  const promptTextareaRef = useRef(null);

  // Initialize edited experiences
  useEffect(() => {
    if (experiences && experiences.length > 0) {
      setEditedExperiences([...experiences]);
    } else {
      // Clear edited experiences if no experiences are provided
      setEditedExperiences([]);
    }
  }, [experiences]);

  // Focus textarea when regenerate modal opens
  useEffect(() => {
    if (regenerateModalExp && promptTextareaRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        promptTextareaRef.current.focus();
      }, 100);
    }
  }, [regenerateModalExp]);

  // Handle description edit
  const handleDescriptionChange = (expId, newDescription) => {
    setEditedExperiences(prev => 
      prev.map(exp => {
        if (exp.experience_id === expId) {
          // Get the baseline content (what's currently saved)
          const savedContent = exp.overridden_project_description || exp.experience?.project_description || '';
          
          // If the new description matches the saved content, remove temp_custom_description
          if (newDescription === savedContent) {
            const { temp_custom_description, ...expWithoutTemp } = exp;
            return expWithoutTemp;
          }
          
          // Otherwise, set the temp description
          return { ...exp, temp_custom_description: newDescription };
        }
        return exp;
      })
    );
  };

  // Handle AI description edit
  const handleAIDescriptionEdit = (expId, newDescription) => {
    setEditedExperiences(prev => 
      prev.map(exp => 
        exp.experience_id === expId 
          ? { ...exp, ai_rewritten_description: newDescription } 
          : exp
      )
    );
  };

  // Save AI description
  const saveAIDescription = async (expId, description) => {
    // This would typically save to backend, for now just update local state
    setEditedExperiences(prev => 
      prev.map(exp => 
        exp.experience_id === expId 
          ? { ...exp, ai_rewritten_description: description } 
          : exp
      )
    );
  };

  // Check if experience has unsaved changes
  const hasUnsavedChanges = (exp) => {
    if (exp.temp_custom_description === undefined) {
      return false; // No current edits
    }
    
    // Compare current edit with what's saved (overridden or original)
    const savedContent = exp.overridden_project_description || exp.experience?.project_description || '';
    return exp.temp_custom_description !== savedContent;
  };

  // Check if experience has any changes from original (for Reset button)
  const hasChangesFromOriginal = (exp) => {
    const currentContent = exp.temp_custom_description !== undefined 
      ? exp.temp_custom_description 
      : exp.overridden_project_description || '';
    const originalContent = exp.experience?.project_description || '';
    return currentContent !== originalContent;
  };

  // Reset to original description
  const handleResetToOriginal = (expId) => {
    setEditedExperiences(prev => 
      prev.map(exp => 
        exp.experience_id === expId 
          ? { 
              ...exp, 
              temp_custom_description: exp.experience?.project_description || '',
              overridden_project_description: null,
              ai_rewritten_description: null,
              use_ai_version: false
            } 
          : exp
      )
    );
  };

  // Toggle between AI and custom version
  const toggleAIVersion = async (expId, useAI) => {
    try {
      const response = await api.request('/api/toggle-ai-version', {
        method: 'POST',
        body: JSON.stringify({
          resume_id: resumeId,
          experience_id: expId,
          use_ai: useAI
        })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle version');
      }

      const data = await response.json();
      
      // Update the UI with the new description and version
      setEditedExperiences(prev => 
        prev.map(exp => 
          exp.experience_id === expId 
            ? { 
                ...exp, 
                use_ai_version: data.use_ai_version,
                current_description: data.description
              } 
            : exp
        )
      );
      
      setSaveStatus({ 
        type: 'success', 
        message: 'Version preference saved successfully' 
      });
      if (typeof onSave === 'function') {
        // Refresh parent resume data so other tabs reflect the new state
        onSave();
      }
    } catch (error) {
      console.error('Error toggling AI version:', error);
      setSaveStatus({ 
        type: 'error', 
        message: 'Failed to save version preference' 
      });
    }
  };

  // Save custom description
  const saveCustomDescription = async (expId, description) => {
    try {
      const response = await api.request('/api/update-experience-description', {
        method: 'POST',
        body: JSON.stringify({
          resume_id: resumeId,
          experience_id: expId,
          description: description
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save description');
      }

      const data = await response.json();
      
      // Update the UI with the saved description
      setEditedExperiences(prev => 
        prev.map(exp => 
          exp.experience_id === expId 
            ? { 
                ...exp, 
                overridden_project_description: data.description,
                current_description: data.description,
                temp_custom_description: undefined
              } 
            : exp
        )
      );
      
      setSaveStatus({ 
        type: 'success', 
        message: 'Changes saved successfully' 
      });
      if (typeof onSave === 'function') {
        onSave();
      }
    } catch (error) {
      console.error('Error saving description:', error);
      setSaveStatus({ 
        type: 'error', 
        message: 'Failed to save custom description' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk AI generation
  const handleBulkAIGeneration = async () => {
    setIsGeneratingAI(true);
    setSaveStatus({ type: 'info', message: 'Generating AI rewrites for all experiences...' });

    try {
      const response = await api.request('/api/bulk-ai-rewrite', {
        method: 'POST',
        body: JSON.stringify({ resume_id: resumeId })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI rewrites');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update the experiences with AI-generated content
        setEditedExperiences(prev => 
          prev.map(exp => {
            const aiUpdate = data.updated_experiences.find(u => u.experience_id === exp.experience_id);
            if (aiUpdate) {
              return {
                ...exp,
                ai_rewritten_description: aiUpdate.ai_rewritten_description
              };
            }
            return exp;
          })
        );
        
        setSaveStatus({ 
          type: 'success', 
          message: data.message || 'AI rewrites generated successfully' 
        });
        if (typeof onSave === 'function') {
          onSave();
        }
      } else {
        setSaveStatus({ 
          type: 'error', 
          message: data.message || 'Failed to generate AI rewrites' 
        });
      }
    } catch (error) {
      console.error('Error generating bulk AI rewrites:', error);
      setSaveStatus({ 
        type: 'error', 
        message: 'Failed to generate AI rewrites' 
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Single experience AI generation
  const handleSingleAIGeneration = async (experienceId) => {
    setIsGeneratingAI(true);
    setSaveStatus({ type: 'info', message: 'Generating AI rewrite...' });

    try {
      const response = await api.request('/api/single-ai-rewrite', {
        method: 'POST',
        body: JSON.stringify({ 
          resume_id: resumeId,
          experience_id: experienceId 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI rewrite');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update the specific experience with AI-generated content and set it as current content
        setEditedExperiences(prev => 
          prev.map(exp => 
            exp.experience_id === experienceId
              ? { 
                  ...exp, 
                  ai_rewritten_description: data.ai_rewritten_description,
                  temp_custom_description: data.ai_rewritten_description,
                  use_ai_version: true
                }
              : exp
          )
        );
        
        setSaveStatus({ 
          type: 'success', 
          message: data.message || 'AI description generated and applied' 
        });
        if (typeof onSave === 'function') {
          onSave();
        }
      } else {
        setSaveStatus({ 
          type: 'error', 
          message: data.message || 'Failed to generate AI rewrite' 
        });
      }
    } catch (error) {
      console.error('Error generating AI rewrite:', error);
      setSaveStatus({ 
        type: 'error', 
        message: 'Failed to generate AI rewrite' 
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Handle regenerate with custom prompt
  const handleRegenerateWithPrompt = async () => {
    if (!regenerateModalExp || !regeneratePrompt.trim()) return;

    setIsGeneratingAI(true);
    setSaveStatus({ type: 'info', message: 'Regenerating with custom prompt...' });

    try {
      const response = await api.request('/api/ai-rewrite-with-prompt', {
        method: 'POST',
        body: JSON.stringify({ 
          experience_id: regenerateModalExp,
          custom_prompt: regeneratePrompt 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate content');
      }

      const data = await response.json();
      
      if (data.success) {
        setEditedExperiences(prev => 
          prev.map(exp => 
            exp.experience_id === regenerateModalExp
              ? { 
                  ...exp, 
                  ai_rewritten_description: data.ai_rewritten_description,
                  temp_custom_description: data.ai_rewritten_description  // Show the new content immediately
                }
              : exp
          )
        );
        
        setSaveStatus({ 
          type: 'success', 
          message: 'Content regenerated with custom prompt! Review and save if you like the result.' 
        });
        if (typeof onSave === 'function') {
          onSave();
        }
      } else {
        setSaveStatus({ 
          type: 'error', 
          message: data.message || 'Failed to regenerate content' 
        });
      }
    } catch (error) {
      console.error('Error regenerating content:', error);
      setSaveStatus({ 
        type: 'error', 
        message: 'Failed to regenerate content' 
      });
    } finally {
      setIsGeneratingAI(false);
      setRegenerateModalExp(null);
      setRegeneratePrompt('');
    }
  };

  // Handle experience reordering
  const handleReorderExperiences = async (newOrder) => {
    try {
      const response = await api.request('/api/reorder-experiences', {
        method: 'POST',
        body: JSON.stringify({
          resume_id: resumeId,
          experience_order: newOrder
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reorder experiences');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update local state to reflect new order
        const reorderedExperiences = [...editedExperiences];
        reorderedExperiences.sort((a, b) => {
          const orderA = newOrder.find(o => o.experience_id === a.experience_id)?.display_order || 0;
          const orderB = newOrder.find(o => o.experience_id === b.experience_id)?.display_order || 0;
          return orderA - orderB;
        });
        
        setEditedExperiences(reorderedExperiences);
        
        setSaveStatus({ 
          type: 'success', 
          message: 'Experience order updated successfully!' 
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        setSaveStatus({ 
          type: 'error', 
          message: data.message || 'Failed to reorder experiences' 
        });
      }
    } catch (error) {
      console.error('Error reordering experiences:', error);
      setSaveStatus({ 
        type: 'error', 
        message: 'Failed to reorder experiences' 
      });
    }
  };

  // Handle save all
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus({ type: 'info', message: 'Saving all changes...' });

    try {
      // Save all custom descriptions that have been edited
      const savePromises = editedExperiences
        .filter(exp => exp.temp_custom_description !== undefined)
        .map(exp => 
          saveCustomDescription(exp.experience_id, exp.temp_custom_description)
        );

      await Promise.all(savePromises);
      
      setSaveStatus({ 
        type: 'success', 
        message: 'All changes saved successfully' 
      });
      
      // Call the parent's onSave if provided
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving all changes:', error);
      setSaveStatus({ 
        type: 'error', 
        message: 'Some changes could not be saved' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are unsaved changes across all experiences
  const hasAnyUnsavedChanges = editedExperiences.some(exp => hasUnsavedChanges(exp));

  // Clear status message after 5 seconds
  useEffect(() => {
    if (saveStatus.message) {
      const timer = setTimeout(() => {
        setSaveStatus({ type: '', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  if (!editedExperiences || editedExperiences.length === 0) {
    return (
      <div className="personalize-content-tab">
        <div className="no-experiences">
          <p>No experiences selected for this resume.</p>
          <button onClick={onBack} className="button-secondary">
            Back to Resume
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="personalize-content-tab">
      <div className="personalize-header">
        <div className="header-content">
          <div className="header-text">
            <h2>Personalize Experience Content</h2>
            <p>Edit and customize your experience descriptions for this resume.</p>
          </div>
          {editedExperiences.length > 1 && (
            <div className="header-actions">
              <button 
                className="button-secondary"
                onClick={() => setShowReorderModal(true)}
                title="Reorder experiences for your resume"
              >
                📋 Reorder Experiences
              </button>
            </div>
          )}
        </div>
      </div>



      {saveStatus.message && (
        <div className={`status-message ${saveStatus.type}`}>
          {saveStatus.message}
        </div>
      )}

   
      <div className="experience-list">
        {editedExperiences.map((exp) => (
          <div key={exp.experience_id} className="experience-card">
            <div className="experience-header-compact">
              <h4 className="experience-title">{exp.experience?.project_name || 'Untitled Experience'}</h4>
              <div className="content-actions">
                {/* Show Generate button only if no AI content exists */}
                {!exp.ai_rewritten_description && (
                  <button 
                    className="button-ai"
                    onClick={() => handleSingleAIGeneration(exp.experience_id)}
                    disabled={isGeneratingAI || isSaving}
                    title="Generate AI-enhanced description"
                  >
                    {isGeneratingAI ? '🔄 Generating...' : '🤖 Generate'}
                  </button>
                )}
                
                {/* Show Regenerate button only if AI content exists */}
                {exp.ai_rewritten_description && (
                  <button 
                    className="button-ai"
                    onClick={() => {
                      setRegenerateModalExp(exp.experience_id);
                      setRegeneratePrompt('');
                    }}
                    disabled={isGeneratingAI || isSaving}
                    title="Regenerate AI description with custom instructions"
                  >
                    🔄 Regenerate
                  </button>
                )}
                
                <button 
                  className="button-primary"
                  onClick={() => saveCustomDescription(
                    exp.experience_id, 
                    exp.temp_custom_description !== undefined 
                      ? exp.temp_custom_description 
                      : exp.overridden_project_description || exp.experience?.project_description || ''
                  )}
                  disabled={isSaving || !hasUnsavedChanges(exp)}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                
                <button 
                  className="button-reset"
                  onClick={() => handleResetToOriginal(exp.experience_id)}
                  disabled={!hasChangesFromOriginal(exp)}
                  title="Reset to original description"
                >
                  🔄 Reset
                </button>
              </div>
            </div>
            
            <textarea
              value={exp.temp_custom_description !== undefined 
                ? exp.temp_custom_description 
                : exp.overridden_project_description || exp.experience?.project_description || ''}
              onChange={(e) => handleDescriptionChange(exp.experience_id, e.target.value)}
              placeholder="Enter the project description..."
              rows={8}
              className="experience-textarea"
            />
          </div>
        ))}
      </div>

      <div className="action-buttons">
        <div className="regenerate-hint">
          <p>💡 After saving your changes, go to the "View/Edit Resume" tab and click "Regenerate" to update the resume with your personalized content.</p>
        </div>
      </div>

      {/* Regenerate Modal */}
      {regenerateModalExp && (
        <div className="modal-overlay" onClick={() => setRegenerateModalExp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Regenerate AI Content</h3>
            <p>Provide specific instructions for how you want the AI to modify the content:</p>
            <textarea
              ref={promptTextareaRef}
              value={regeneratePrompt}
              onChange={(e) => setRegeneratePrompt(e.target.value)}
              placeholder="e.g., Make it more technical, focus on leadership aspects, emphasize cost savings..."
              rows={4}
              className="prompt-textarea"
            />
            <div className="modal-actions">
              <button 
                className="button-secondary"
                onClick={() => setRegenerateModalExp(null)}
                disabled={isGeneratingAI}
              >
                Cancel
              </button>
              <button 
                className="button-primary"
                onClick={handleRegenerateWithPrompt}
                disabled={isGeneratingAI || !regeneratePrompt.trim()}
              >
                {isGeneratingAI ? '🔄 Generating...' : '🤖 Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Modal */}
      <ReorderModal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        experiences={editedExperiences}
        onReorder={handleReorderExperiences}
      />
    </div>
  );
};

export default PersonalizeContentTab;
