import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import Tabs from '../components/Tabs';
import ResumeListTab from '../components/ResumeListTab';
import ExperienceSelectionTab from '../components/ExperienceSelectionTab';
import ResumeEditorTab from '../components/ResumeEditorTab';
import PersonalizeContentTab from '../components/PersonalizeContentTab';
import { useProposal } from '../context/ProposalContext';
import { useResume } from '../context/ResumeContext';
import { api } from '../lib/api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import '../App.css';

function Resume() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const { getClients, getContacts, getExperiences, getProposals } = useData();
  const { selectedProposal, setSelectedProposal } = useProposal();
  const { selectedResume, setSelectedResume } = useResume();

  const [showSelectProposalModal, setShowSelectProposalModal] = useState(false);
  const [showCreateProposalModal, setShowCreateProposalModal] = useState(false);
  const [showEditProposalModal, setShowEditProposalModal] = useState(false);
  const [allProposals, setAllProposals] = useState([]);
  const [allExperiences, setAllExperiences] = useState([]);
  const [selectedExperiences, setSelectedExperiences] = useState([]);
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Proposal form state
  const [proposalFormData, setProposalFormData] = useState({
    name: '',
    context: '',
    source: 'manual',
    status: 'draft',
    location: '',
    scope: '',
    due_date: '',
    project_brief: '',
    internal_notes: '',
    client_id: '',
    contact_id: ''
  });

  // State for resumes related to the selected proposal
  const [resumesForProposal, setResumesForProposal] = useState([]);
  const [activeTab, setActiveTab] = useState('Experience Selection');
  const [editedResumeContent, setEditedResumeContent] = useState('');

  // State for personalization
  const [personalizationExperiences, setPersonalizationExperiences] = useState([]);

  // Fetch clients, all proposals, and all experiences on component mount
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      try {
        const [clientsRes, proposalsRes, experiencesRes, contactsRes] = await Promise.all([
          getClients(),
          getProposals(15000),
          getExperiences(),
          getContacts(),
        ]);

        const clientsData = clientsRes || [];
        const proposalsData = proposalsRes || [];
        const experiencesData = experiencesRes || [];
        const contactsData = contactsRes || [];

        setClients(clientsData);
        setContacts(contactsData);
        setAllProposals(proposalsData);
        setAllExperiences(experiencesData);

      } catch (error) {
        setError('Failed to fetch initial data.');
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user]);

  // Effect to fetch resumes when selectedProposal changes
  useEffect(() => {
    if (authLoading || !user || !selectedProposal) return;
      // Fetch resumes for the selected proposal
      const fetchResumes = async () => {
        try {
          const response = await api.request(`/api/proposals/${selectedProposal.id}/resumes`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for resumes`);
          }
          const data = await response.json();
          setResumesForProposal(data);
        } catch (err) {
          console.error('Error fetching resumes for proposal:', err);
          setError('Failed to fetch resumes for this proposal.');
        }
      };
      fetchResumes();
  }, [authLoading, user, selectedProposal]);

  // Clear selected resume when proposal ID changes (not when the same proposal object updates)
  useEffect(() => {
    setSelectedResume(null);
  }, [selectedProposal?.id]);

  const handleCreateProposal = () => {
    // Reset form and show create modal
    setProposalFormData({
      name: '',
      context: '',
      source: 'manual',
      status: 'draft',
      location: '',
      scope: '',
      due_date: '',
      project_brief: '',
      internal_notes: '',
      client_id: '',
      contact_id: ''
    });
    setShowCreateProposalModal(true);
  };

  const handleEditProposal = () => {
    // Pre-fill form with current proposal data
    if (selectedProposal) {
      setProposalFormData({
        name: selectedProposal.name || '',
        context: selectedProposal.context || '',
        source: selectedProposal.source || 'manual',
        status: selectedProposal.status || 'draft',
        location: selectedProposal.location || '',
        scope: selectedProposal.scope || '',
        due_date: selectedProposal.due_date || '',
        project_brief: selectedProposal.project_brief || '',
        internal_notes: selectedProposal.internal_notes || '',
        client_id: selectedProposal.client_id || '',
        contact_id: selectedProposal.contact_id || ''
      });
      setShowEditProposalModal(true);
    }
  };

  const handleSelectExistingProposal = (e) => {
    const proposalId = parseInt(e.target.value);
    const proposal = allProposals.find(p => p.id === proposalId);
    setSelectedProposal(proposal);
    setShowSelectProposalModal(false);
  };

  const handleSaveNewProposal = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Format data for backend validation
      const submitData = {
        ...proposalFormData,
        client_id: proposalFormData.client_id ? parseInt(proposalFormData.client_id) : null,
        contact_id: proposalFormData.contact_id ? parseInt(proposalFormData.contact_id) : null,
        due_date: proposalFormData.due_date || null
      };

      const response = await api.request('/api/proposals', {
        method: 'POST',
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const newProposal = await response.json();
        setAllProposals([...allProposals, newProposal]);
        setSelectedProposal(newProposal);
        setShowCreateProposalModal(false);
        setSuccessMessage('Proposal created successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create proposal');
      }
    } catch (err) {
      setError('Failed to create proposal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProposal = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Format data for backend validation
      const submitData = {
        ...proposalFormData,
        client_id: proposalFormData.client_id ? parseInt(proposalFormData.client_id) : null,
        contact_id: proposalFormData.contact_id ? parseInt(proposalFormData.contact_id) : null,
        due_date: proposalFormData.due_date || null
      };

      const response = await api.request(`/api/proposals/${selectedProposal.id}`, {
        method: 'PUT',
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const updatedProposal = await response.json();
        setAllProposals(allProposals.map(p => p.id === updatedProposal.id ? updatedProposal : p));
        setSelectedProposal(updatedProposal);
        setShowEditProposalModal(false);
        setSuccessMessage('Proposal updated successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update proposal');
      }
    } catch (err) {
      setError('Failed to update proposal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewResume = async (alias, userProfileId, templateId) => {
    if (!selectedProposal) {
      setError('Please select a proposal first.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await api.request('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({
          project_proposal_id: selectedProposal.id,
          alias: alias || null,
          user_profile_id: userProfileId || null,
          template_id: templateId || null,
          experience_ids: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newResume = await response.json();
      setResumesForProposal([...resumesForProposal, newResume]);
      setSelectedResume(newResume);
      setActiveTab('Experience Selection'); // New resumes start with experience selection
    } catch (error) {
      setError('Failed to create resume.');
      console.error('Error creating resume:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResume = (resume) => {
    setSelectedResume(resume);
    // Smart tab selection: show preview if resume has content, otherwise show experience selection
    const hasContent = resume.generated_content && resume.generated_content.trim().length > 0;
    setActiveTab(hasContent ? 'View/Edit Resume' : 'Experience Selection');
  };

  const handleDeleteResume = async (resumeId) => {
    setConfirmDeleteId(resumeId);
  };

  const confirmDeleteResume = async () => {
    const resumeId = confirmDeleteId;
    if (!resumeId) return;
    setLoading(true);
    try {
      const response = await api.request(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setResumesForProposal(resumesForProposal.filter(r => r.id !== resumeId));
      if (selectedResume?.id === resumeId) setSelectedResume(null);
      toast.success('Resume deleted successfully!');
    } catch (error) {
      setError('Failed to delete resume.');
      console.error('Error deleting resume:', error);
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handleExperienceSelection = async (experienceId) => {
    if (!selectedResume || !selectedResume.id) {
      setError('No resume selected.');
      return;
    }

    // Update local state optimistically
    const newSelectedExperiences = selectedExperiences.includes(experienceId)
      ? selectedExperiences.filter(id => id !== experienceId)
      : [...selectedExperiences, experienceId];
    
    setSelectedExperiences(newSelectedExperiences);

    try {
      // Immediately save to database
      const response = await api.request(`/api/resumes/${selectedResume.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          experience_ids: newSelectedExperiences,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedResume = await response.json();
      
      // Update the resume in our local state
      setResumesForProposal(resumesForProposal.map(r => r.id === updatedResume.id ? updatedResume : r));
      setSelectedResume(updatedResume);
      
    } catch (error) {
      // Revert local state on error
      setSelectedExperiences(selectedExperiences);
      setError('Failed to update resume experiences.');
      console.error('Error updating resume experiences:', error);
    }
  };

  const handleRegenerateResume = async () => {
    if (!selectedResume || !selectedResume.id) {
      setError('No resume selected.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Just regenerate the resume content with existing experiences (no experience update)
      const generateResponse = await api.request('/api/generate-final-resume', {
        method: 'POST',
        body: JSON.stringify({
          resume_id: selectedResume.id,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error(`HTTP error! status: ${generateResponse.status} during content generation`);
      }

      const generateResult = await generateResponse.json();
      
      // Update the current resume object with the new content
      const updatedResumeWithContent = {
        ...selectedResume,
        generated_content: generateResult.generated_content
      };
      
      setResumesForProposal(resumesForProposal.map(r => r.id === updatedResumeWithContent.id ? updatedResumeWithContent : r));
      setSelectedResume(updatedResumeWithContent);
      
      // Switch to preview after regeneration and show success message
      setError(null);
      setActiveTab('View/Edit Resume');
      setSuccessMessage('Resume regenerated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to regenerate resume.');
      console.error('Error regenerating resume:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResumeChanges = async (e) => {
    e.preventDefault();
    
    if (!selectedResume || !selectedResume.id) {
      setError('No resume selected');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const response = await api.request(`/api/resumes/${selectedResume.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          generated_content: editedResumeContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedResume = await response.json();
      setResumesForProposal(resumesForProposal.map(r => r.id === updatedResume.id ? updatedResume : r));
      setSelectedResume(updatedResume);
      toast.success('Resume updated successfully!');
    } catch (error) {
      setError('Failed to save resume changes.');
      console.error('Error saving resume changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExperienceSave = () => {
    if (selectedResume && selectedResume.id) {
      api.request(`/api/resumes/${selectedResume.id}`)
        .then(res => res.json())
        .then(data => {
          setEditedResumeContent(data.generated_content || '');
        })
        .catch(console.error);
    }
  };

  const getDisplayName = (resume, index) => {
    if (!resume) return 'Resume';
    const safeIndex = typeof index === 'number' && index >= 0 ? index : 0;
    return resume.alias || `Resume #${safeIndex + 1}`;
  };

  // Load experiences for the selected resume when it changes
  useEffect(() => {
    if (authLoading || !user) return;
    if (selectedResume && selectedResume.id) {
      api.request(`/api/resumes/${selectedResume.id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          const experiencesWithDetails = data.resume_experience_details.map(red => ({
            ...red,
            ...red.experience,
            current_description: red.current_description || red.experience?.project_description || ''
          }));
          setPersonalizationExperiences(experiencesWithDetails);
          setEditedResumeContent(data.generated_content || '');
          
          // Set selected experiences for the experience selection tab
          setSelectedExperiences(data.resume_experience_details.map(red => red.experience_id));
        })
        .catch(error => {
          console.error('Error loading resume experiences:', error);
        });
    } else {
      setPersonalizationExperiences([]);
      setSelectedExperiences([]);
      setEditedResumeContent('');
    }
  }, [authLoading, user, selectedResume]);

  // Show Resume List if no resume is selected, otherwise show resume-specific tabs
  if (selectedProposal && !selectedResume) {
    return (
      <div>
        <div className="proposal-toolbar">
          <div className="selected-proposal-info">
            <h3>Proposal: <span className="proposal-name-display">{selectedProposal.name}</span></h3>
            <p>Client: {clients.find(c => c.id === selectedProposal.client_id)?.client_name || 'N/A'}</p>
            {selectedProposal.context && <p>Context: {selectedProposal.context}</p>}
          </div>
          <div className="toolbar-actions">
            <button className="button-secondary" onClick={handleEditProposal}>
              Edit Proposal
            </button>
            <button className="button-secondary" onClick={() => setShowSelectProposalModal(true)}>
              Change Proposal
            </button>
            <button className="button-primary" onClick={handleCreateProposal}>
              Create New Proposal
            </button>
          </div>
        </div>

        <h2>Resume Builder</h2>
        
        <ResumeListTab
          resumes={resumesForProposal}
          onSelectResume={handleSelectResume}
          onCreateNewResume={handleCreateNewResume}
          onDeleteResume={handleDeleteResume}
          selectedProposal={selectedProposal}
          clients={clients}
        />

        {/* Modals for proposal management */}
        {showSelectProposalModal && (
          <Modal onClose={() => setShowSelectProposalModal(false)}>
            <h3>Select an Existing Proposal</h3>
            <div className="form-group">
              <label>
                Existing Proposals:
                <select
                  value={selectedProposal ? selectedProposal.id : ''}
                  onChange={handleSelectExistingProposal}
                >
                  <option value="">-- Select a Proposal --</option>
                  {allProposals.map((proposal) => (
                    <option key={proposal.id} value={proposal.id}>
                      {proposal.name} (Client: {clients.find(c => c.id === proposal.client_id)?.client_name || 'N/A'})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="button-secondary" onClick={() => setShowSelectProposalModal(false)}>Cancel</button>
            </div>
          </Modal>
        )}

        {/* Create Proposal Modal */}
        {showCreateProposalModal && (
          <Modal onClose={() => setShowCreateProposalModal(false)} className="proposal-modal structured-modal">
            <div className="modal-header">
              <h2>Create New Proposal</h2>
            </div>
            <form onSubmit={handleSaveNewProposal}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Proposal Name *</label>
                    <input
                      type="text"
                      required
                      value={proposalFormData.name}
                      onChange={(e) => setProposalFormData({...proposalFormData, name: e.target.value})}
                      placeholder="Enter proposal name..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={proposalFormData.status}
                      onChange={(e) => setProposalFormData({...proposalFormData, status: e.target.value})}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="under_review">Under Review</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Client</label>
                    <select
                      value={proposalFormData.client_id}
                      onChange={(e) => setProposalFormData({...proposalFormData, client_id: e.target.value})}
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.client_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Primary Contact</label>
                    <select
                      value={proposalFormData.contact_id}
                      onChange={(e) => setProposalFormData({...proposalFormData, contact_id: e.target.value})}
                    >
                      <option value="">Select Contact</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>{contact.contact_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Project Brief</label>
                    <textarea
                      rows="2"
                      value={proposalFormData.project_brief}
                      onChange={(e) => setProposalFormData({...proposalFormData, project_brief: e.target.value})}
                      placeholder="Brief description of the project..."
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Project Context</label>
                    <textarea
                      rows="3"
                      value={proposalFormData.context}
                      onChange={(e) => setProposalFormData({...proposalFormData, context: e.target.value})}
                      placeholder="Detailed context for proposal..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <div className="form-actions">
                  <button type="submit" className="button-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Proposal'}
                  </button>
                  <button 
                    type="button" 
                    className="button-secondary" 
                    onClick={() => setShowCreateProposalModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit Proposal Modal */}
        {showEditProposalModal && selectedProposal && (
          <Modal onClose={() => setShowEditProposalModal(false)} className="proposal-modal structured-modal">
            <div className="modal-header">
              <h2>Edit Proposal</h2>
            </div>
            <form onSubmit={handleUpdateProposal}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Proposal Name *</label>
                    <input
                      type="text"
                      required
                      value={proposalFormData.name}
                      onChange={(e) => setProposalFormData({...proposalFormData, name: e.target.value})}
                      placeholder="Enter proposal name..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={proposalFormData.status}
                      onChange={(e) => setProposalFormData({...proposalFormData, status: e.target.value})}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="under_review">Under Review</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Client</label>
                    <select
                      value={proposalFormData.client_id}
                      onChange={(e) => setProposalFormData({...proposalFormData, client_id: e.target.value})}
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.client_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Primary Contact</label>
                    <select
                      value={proposalFormData.contact_id}
                      onChange={(e) => setProposalFormData({...proposalFormData, contact_id: e.target.value})}
                    >
                      <option value="">Select Contact</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>{contact.contact_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Project Brief</label>
                    <textarea
                      rows="2"
                      value={proposalFormData.project_brief}
                      onChange={(e) => setProposalFormData({...proposalFormData, project_brief: e.target.value})}
                      placeholder="Brief description of the project..."
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Project Context</label>
                    <textarea
                      rows="3"
                      value={proposalFormData.context}
                      onChange={(e) => setProposalFormData({...proposalFormData, context: e.target.value})}
                      placeholder="Detailed context for proposal..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <div className="form-actions">
                  <button type="submit" className="button-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Proposal'}
                  </button>
                  <button 
                    type="button" 
                    className="button-secondary" 
                    onClick={() => setShowEditProposalModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </Modal>
        )}

      </div>
    );
  }

  // Show resume-specific tabs when a resume is selected
  const resumeTabs = [
    {
      label: 'Experience Selection',
      content: (
        <ExperienceSelectionTab
          allExperiences={allExperiences}
          selectedExperiences={selectedExperiences}
          handleExperienceSelection={handleExperienceSelection}
          clients={clients}
        />
      ),
    },
    {
      label: 'Personalize Content',
      content: (
        <PersonalizeContentTab
          resumeId={selectedResume?.id}
          experiences={personalizationExperiences}
          onSave={handleExperienceSave}
          onBack={() => setSelectedResume(null)}
          onGenerateResume={(generatedContent) => {
            setEditedResumeContent(generatedContent);
            setResumesForProposal(resumesForProposal.map(r => 
              r.id === selectedResume.id 
                ? { ...r, generated_content: generatedContent }
                : r
            ));
            setActiveTab('View/Edit Resume');
          }}
        />
      ),
    },
    {
      label: 'View/Edit Resume',
      content: (
        <ResumeEditorTab
          editingResume={selectedResume}
          editedResumeContent={editedResumeContent}
          setEditedResumeContent={setEditedResumeContent}
          handleSaveResumeChanges={handleSaveResumeChanges}
                      handleUpdateResume={handleRegenerateResume}
          selectedExperiences={selectedExperiences}
          onClose={() => setSelectedResume(null)}
          onResumeUpdated={(updated) => {
            setResumesForProposal(resumesForProposal.map(r => r.id === updated.id ? updated : r));
            setSelectedResume(updated);
          }}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Proposal toolbar - hide change proposal button when resume is selected */}
      <div className="proposal-toolbar">
        <div className="selected-proposal-info">
          <h3>Proposal: <span className="proposal-name-display">{selectedProposal?.name}</span></h3>
        </div>
        {!selectedResume && (
          <div className="toolbar-actions">
            <button className="button-secondary" onClick={() => setShowSelectProposalModal(true)}>
              Change Proposal
            </button>
          </div>
        )}
      </div>

      {/* Resume context navigation */}
      {selectedResume && (
        <div className="resume-context-nav">
          <button 
            className="button-secondary button-with-icon" 
            onClick={() => setSelectedResume(null)}
            title="Back to Resume List"
          >
            <ChevronLeftIcon style={{ fontSize: '20px' }} />
            Back
          </button>
          <span className="breadcrumb-separator">›</span>
          <h2>{getDisplayName(selectedResume, resumesForProposal.findIndex(r => r.id === selectedResume?.id))}</h2>
        </div>
      )}

      {selectedProposal && selectedResume && (
        <div className="resume-builder-content">
          <Tabs tabs={resumeTabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      )}

      {!selectedProposal && (
        <div className="empty-state">
          <h3>No Proposal Selected</h3>
          <p>Please select or create a proposal to start building resumes.</p>
          <button className="button-primary" onClick={() => setShowSelectProposalModal(true)}>
            Select Proposal
          </button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Success message display */}
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="loading-indicator">
          Loading...
        </div>
      )}

      {/* Global Select Proposal Modal so it works even without a selected proposal */}
      {showSelectProposalModal && (
        <Modal onClose={() => setShowSelectProposalModal(false)}>
          <h3>Select an Existing Proposal</h3>
          <div className="form-group">
            <label>
              Existing Proposals:
              <select
                value={selectedProposal ? selectedProposal.id : ''}
                onChange={handleSelectExistingProposal}
              >
                <option value="">-- Select a Proposal --</option>
                {allProposals.map((proposal) => (
                  <option key={proposal.id} value={proposal.id}>
                    {proposal.name} (Client: {clients.find(c => c.id === proposal.client_id)?.client_name || 'N/A'})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="button-secondary" onClick={() => setShowSelectProposalModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Confirm delete resume */}
      <Confirm
        open={!!confirmDeleteId}
        title="Delete resume?"
        message="This action cannot be undone."
        destructive
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDeleteResume}
      />
    </div>
  );
}

export default Resume;