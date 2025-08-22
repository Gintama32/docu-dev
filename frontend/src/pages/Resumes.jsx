import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import Tabs from '../components/Tabs';
import ExperienceSelectionTab from '../components/ExperienceSelectionTab';
import PersonalizeContentTab from '../components/PersonalizeContentTab';
import ResumeEditorTab from '../components/ResumeEditorTab';
import '../components/UnifiedTable.css';
// Note: useToast should be implemented or imported from the right context

function Resumes() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { resumeId } = useParams();
  
  // Simple toast implementation - you might want to use a proper toast library
  const toast = (message) => {
    alert(message); // Replace with proper toast implementation
  };
  
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Resume editing state
  const [selectedResume, setSelectedResume] = useState(null);
  const [activeTab, setActiveTab] = useState('Experience Selection');
  const [editedResumeContent, setEditedResumeContent] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [proposalFilter, setProposalFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  // Form data for creating new resume
  const [newResumeData, setNewResumeData] = useState({
    alias: '',
    project_proposal_id: '',
    template_id: '',
    user_profile_id: '',
    experience_ids: []
  });
  
  // Dropdown data
  const [proposals, setProposals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [clients, setClients] = useState([]);

  // Fetch all data on component mount
  useEffect(() => {
    if (authLoading || !user) return;
    fetchResumes();
    fetchDropdownData();
  }, [authLoading, user]);

  // Handle URL parameter changes
  useEffect(() => {
    if (resumeId && resumes.length > 0 && !selectedResume) {
      const resume = resumes.find(r => r.id === parseInt(resumeId));
      if (resume) {
        // Only trigger if we don't already have this resume selected
        if (!selectedResume || selectedResume.id !== resume.id) {
          handleEditResumeFromURL(resume);
        }
      } else {
        // Resume not found, redirect to list
        navigate('/resumes', { replace: true });
        toast('Resume not found');
      }
    } else if (!resumeId && selectedResume) {
      // URL changed to list view, clear selection
      setSelectedResume(null);
    }
  }, [resumeId, resumes]);

  // Separate function for URL-triggered resume loading to avoid infinite loops
  const handleEditResumeFromURL = async (resume) => {
    try {
      // Fetch full resume details including experiences (don't update URL here)
      const response = await api.request(`/api/resumes/${resume.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch resume details');
      }
      const fullResumeData = await response.json();
      
      setSelectedResume(fullResumeData);
      setActiveTab('Experience Selection');
      setEditedResumeContent(fullResumeData.generated_content || '');
    } catch (err) {
      console.error('Error fetching resume details:', err);
      toast('Failed to load resume details: ' + err.message);
    }
  };

  const fetchResumes = async () => {
    try {
      const response = await api.request('/api/resumes');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setResumes(data);
    } catch (err) {
      console.error('Error fetching resumes:', err);
      setError('Failed to fetch resumes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [proposalsRes, templatesRes, profilesRes, experiencesRes, clientsRes] = await Promise.all([
        api.request('/api/proposals?limit=1000'),
        api.request('/api/templates'),
        api.request('/api/user-profiles?only_mine=true'),
        api.request('/api/experiences'),
        api.request('/api/clients')
      ]);

      if (proposalsRes.ok) {
        const proposalsData = await proposalsRes.json();
        setProposals(proposalsData);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        setUserProfiles(profilesData);
      }

      if (experiencesRes.ok) {
        const experiencesData = await experiencesRes.json();
        setExperiences(experiencesData);
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const handleCreateResume = async (e) => {
    e.preventDefault();
    
    try {
      const createData = {
        ...newResumeData,
        project_proposal_id: newResumeData.project_proposal_id ? parseInt(newResumeData.project_proposal_id) : null,
        template_id: newResumeData.template_id ? parseInt(newResumeData.template_id) : null,
        user_profile_id: newResumeData.user_profile_id ? parseInt(newResumeData.user_profile_id) : null,
        experience_ids: newResumeData.experience_ids
      };

      const response = await api.json('/api/resumes', 'POST', createData);
      
      if (response.response.ok) {
        toast('Resume created successfully!');
        const newResume = response.data;
        fetchResumes();
        setShowCreateModal(false);
        setNewResumeData({
          alias: '',
          project_proposal_id: '',
          template_id: '',
          user_profile_id: '',
          experience_ids: []
        });
        
        // Automatically open the new resume for editing
        handleEditResume(newResume);
      } else {
        throw new Error('Failed to create resume');
      }
    } catch (err) {
      console.error('Error creating resume:', err);
      toast('Failed to create resume: ' + err.message);
    }
  };

  const handleDeleteResume = async (resumeId) => {
    try {
      const response = await api.request(`/api/resumes/${resumeId}`, 'DELETE');
      
      if (response.ok) {
        toast('Resume deleted successfully!');
        fetchResumes();
      } else {
        throw new Error('Failed to delete resume');
      }
    } catch (err) {
      console.error('Error deleting resume:', err);
      toast('Failed to delete resume: ' + err.message);
    }
    setConfirmDeleteId(null);
  };

  const handleEditResume = useCallback(async (resume) => {
    try {
      // Update URL to include resume ID
      navigate(`/resumes/${resume.id}`, { replace: false });
      
      // Fetch full resume details including experiences
      const response = await api.request(`/api/resumes/${resume.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch resume details');
      }
      const fullResumeData = await response.json();
      
      setSelectedResume(fullResumeData);
      setActiveTab('Experience Selection');
      setEditedResumeContent(fullResumeData.generated_content || '');
    } catch (err) {
      console.error('Error fetching resume details:', err);
      toast('Failed to load resume details: ' + err.message);
    }
  }, [navigate]);

  const handleGeneratePDF = async (resumeId) => {
    try {
      const response = await api.request(`/api/resumes/${resumeId}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume_${resumeId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast('Failed to generate PDF: ' + err.message);
    }
  };

  // Filter resumes based on current filters
  const filteredResumes = resumes.filter(resume => {
    const matchesStatus = !statusFilter || resume.status === statusFilter;
    const matchesProposal = !proposalFilter || resume.project_proposal_id === parseInt(proposalFilter);
    const matchesSearch = !searchQuery || 
      (resume.alias && resume.alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (resume.proposal_name && resume.proposal_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (resume.client_name && resume.client_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesProposal && matchesSearch;
  });

  // Handler functions for resume editing (must be before early returns)
  const handleExperienceSelection = useCallback(async (experienceId) => {
    try {
      // Toggle experience in resume
      const isSelected = selectedResume?.resume_experience_details?.some(red => red.experience_id === experienceId);
      
      if (isSelected) {
        // Remove experience from resume
        // TODO: Implement remove experience API call
      } else {
        // Add experience to resume
        // TODO: Implement add experience API call
      }
    } catch (err) {
      console.error('Error toggling experience:', err);
      toast('Failed to update experience selection');
    }
  }, [selectedResume]);

  const handleUpdateResume = useCallback(async () => {
    if (!selectedResume) return;
    
    try {
      const response = await api.request('/api/generate-final-resume', {
        method: 'POST',
        body: JSON.stringify({ resume_id: selectedResume.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.generated_content) {
          setEditedResumeContent(result.generated_content);
          toast('Resume regenerated successfully!');
        }
      } else {
        throw new Error('Failed to regenerate resume');
      }
    } catch (err) {
      console.error('Error regenerating resume:', err);
      toast('Failed to regenerate resume: ' + err.message);
    }
  }, [selectedResume]);

  const handleSaveResumeChanges = useCallback(async (event) => {
    event.preventDefault();
    if (!selectedResume) return;
    
    try {
      const response = await api.request(`/api/resumes/${selectedResume.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          generated_content: editedResumeContent
        })
      });
      
      if (response.ok) {
        toast('Resume saved successfully!');
        // Instead of calling handleEditResume, just refresh the data
        const refreshResponse = await api.request(`/api/resumes/${selectedResume.id}`);
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          setSelectedResume(refreshedData);
          setEditedResumeContent(refreshedData.generated_content || '');
        }
      } else {
        throw new Error('Failed to save resume');
      }
    } catch (err) {
      console.error('Error saving resume:', err);
      toast('Failed to save resume: ' + err.message);
    }
  }, [selectedResume, editedResumeContent]);

  const handleUserProfileChange = useCallback(async (profileId) => {
    if (!selectedResume) return;
    
    try {
      const response = await api.request(`/api/resumes/${selectedResume.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          user_profile_id: profileId ? parseInt(profileId) : null
        })
      });
      
      if (response.ok) {
        // Refresh the selected resume data
        const refreshResponse = await api.request(`/api/resumes/${selectedResume.id}`);
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          setSelectedResume(refreshedData);
        }
        toast('Resume profile updated successfully!');
      } else {
        throw new Error('Failed to update resume profile');
      }
    } catch (err) {
      console.error('Error updating resume profile:', err);
      toast('Failed to update resume profile: ' + err.message);
    }
  }, [selectedResume]);

  // Resume tabs configuration for editing - memoized to avoid recreating on every render (must be before early returns)
  const resumeTabs = useMemo(() => {
    if (!selectedResume) {
      return [
        { label: 'Experience Selection', content: <div>Loading...</div> },
        { label: 'Personalize Content', content: <div>Loading...</div> },
        { label: 'Resume Viewer', content: <div>Loading...</div> }
      ];
    }

    return [
      {
        label: 'Experience Selection',
        content: (
          <ExperienceSelectionTab
            allExperiences={experiences}
            selectedExperiences={selectedResume.resume_experience_details?.map(red => red.experience_id) || []}
            handleExperienceSelection={handleExperienceSelection}
            clients={clients}
            userProfiles={userProfiles}
            selectedUserProfileId={selectedResume.user_profile_id}
            onUserProfileChange={handleUserProfileChange}
          />
        )
      },
      {
        label: 'Personalize Content',
        content: (
          <PersonalizeContentTab
            resumeId={selectedResume.id}
            experiences={selectedResume.resume_experience_details || []}
            onSave={async () => {
              // Refresh resume data after save
              try {
                const response = await api.request(`/api/resumes/${selectedResume.id}`);
                if (response.ok) {
                  const refreshedData = await response.json();
                  setSelectedResume(refreshedData);
                  setEditedResumeContent(refreshedData.generated_content || '');
                }
              } catch (err) {
                console.error('Error refreshing resume data:', err);
              }
            }}
            onBack={() => navigate('/resumes')}
            onGenerateResume={handleUpdateResume}
          />
        )
      },
      {
        label: 'Resume Viewer',
        content: (
          <ResumeEditorTab
            editingResume={selectedResume}
            editedResumeContent={editedResumeContent}
            setEditedResumeContent={setEditedResumeContent}
            handleSaveResumeChanges={handleSaveResumeChanges}
            handleUpdateResume={handleUpdateResume}
            selectedExperiences={selectedResume.resume_experience_details || []}
            onClose={() => navigate('/resumes')}
            onResumeUpdated={(updatedResume) => {
              setSelectedResume(updatedResume);
              fetchResumes();
            }}
          />
        )
      }
    ];
  }, [selectedResume, experiences, clients, editedResumeContent, handleExperienceSelection, handleSaveResumeChanges, handleUpdateResume, handleUserProfileChange, userProfiles, navigate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDisplayName = (resume, index) => {
    return resume.alias || `Resume #${resume.id}`;
  };

  if (authLoading || loading) {
    return <div className="loading-indicator">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // If a resume is selected for editing, show the editor
  if (selectedResume) {
    return (
      <div className="resumes-page">
        <div className="resume-editor-header">
          <div className="resume-header-top">
            <button 
              className="button-secondary" 
              onClick={() => {
                navigate('/resumes');
                setSelectedResume(null);
              }}
              title="Back to Resume List"
            >
              ← Back to Resumes
            </button>
            <div className="resume-title-info">
              <h1>{getDisplayName(selectedResume)}</h1>
            </div>
          </div>
          
          <div className="resume-tabs-header">
            <div className="tabs-header">
              {resumeTabs.map((tab) => (
                <button
                  key={tab.label}
                  className={`tab-button ${activeTab === tab.label ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.label)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="resume-builder-content">
          <div className="tabs-content">
            {resumeTabs.find(tab => tab.label === activeTab)?.content}
          </div>
        </div>
      </div>
    );
  }

  // Default view: Resume list
  return (
    <div className="resumes-page">
      <div className="page-header">
        <h1>All Resumes</h1>
        <button 
          className="button-primary" 
          onClick={() => setShowCreateModal(true)}
        >
          Create New Resume
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Proposal:</label>
            <select 
              value={proposalFilter} 
              onChange={(e) => setProposalFilter(e.target.value)}
            >
              <option value="">All Proposals</option>
              <option value="0">No Proposal</option>
              {proposals.map(proposal => (
                <option key={proposal.id} value={proposal.id}>
                  {proposal.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by name, proposal, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button 
            className="button-secondary" 
            onClick={() => {
              setStatusFilter('');
              setProposalFilter('');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        Showing {filteredResumes.length} of {resumes.length} resumes
      </div>

      {/* Resumes Table */}
      <div className="unified-table-container">
        <table className="unified-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Proposal</th>
              <th>Client</th>
              <th>Experiences</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResumes.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-no-data">
                  {resumes.length === 0 ? 'No resumes found. Create your first resume!' : 'No resumes match your filters.'}
                </td>
              </tr>
            ) : (
              filteredResumes.map((resume, index) => (
                <tr 
                  key={resume.id} 
                  className="resume-row"
                  onClick={() => handleEditResume(resume)}
                  style={{ cursor: 'pointer' }}
                  title="Click to edit resume"
                >
                  <td>
                    <div className="table-primary-text">{getDisplayName(resume, index)}</div>
                  </td>
                  <td>
                    <span className={`status-badge status-${resume.status?.toLowerCase()}`}>
                      {resume.status || 'Draft'}
                    </span>
                  </td>
                  <td>{resume.proposal_name || 'No Proposal'}</td>
                  <td>{resume.client_name || 'N/A'}</td>
                  <td>{resume.experience_count}</td>
                  <td>{formatDate(resume.created_at)}</td>
                  <td>{formatDate(resume.updated_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button 
                        className="table-action-edit" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditResume(resume);
                        }}
                        title="Edit Resume"
                      >
                        Edit
                      </button>
                      <button 
                        className="table-action-edit" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGeneratePDF(resume.id);
                        }}
                        title="Download PDF"
                      >
                        PDF
                      </button>
                      <button 
                        className="table-action-delete" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(resume.id);
                        }}
                        title="Delete Resume"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Resume Modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateResume} className="create-resume-form">
            <h3>Create New Resume</h3>
            
            <div className="form-group">
              <label>Resume Name:</label>
              <input
                type="text"
                value={newResumeData.alias}
                onChange={(e) => setNewResumeData({...newResumeData, alias: e.target.value})}
                placeholder="e.g., Senior Developer Resume"
              />
              <small className="form-help">Give your resume a meaningful name</small>
            </div>

            <div className="form-group">
              <label>Proposal (Optional):</label>
              <select
                value={newResumeData.project_proposal_id}
                onChange={(e) => setNewResumeData({...newResumeData, project_proposal_id: e.target.value})}
              >
                <option value="">No Proposal</option>
                {proposals.map(proposal => (
                  <option key={proposal.id} value={proposal.id}>
                    {proposal.name}
                  </option>
                ))}
              </select>
              <small className="form-help">Link to a specific proposal or leave blank for a general resume</small>
            </div>

            <div className="form-group">
              <label>User Profile:</label>
              <select
                value={newResumeData.user_profile_id}
                onChange={(e) => setNewResumeData({...newResumeData, user_profile_id: e.target.value})}
              >
                <option value="">Default Profile</option>
                {userProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    Profile #{profile.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Template:</label>
              <select
                value={newResumeData.template_id}
                onChange={(e) => setNewResumeData({...newResumeData, template_id: e.target.value})}
              >
                <option value="">Default Template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="button-primary">Create Resume</button>
              <button 
                type="button" 
                className="button-secondary" 
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <Confirm
        open={!!confirmDeleteId}
        title="Delete Resume?"
        message="This action cannot be undone. All data associated with this resume will be permanently deleted."
        destructive
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => handleDeleteResume(confirmDeleteId)}
      />
    </div>
  );
}

export default Resumes;
