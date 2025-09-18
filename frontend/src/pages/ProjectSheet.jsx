import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import ProjectPicker from '../components/ProjectPicker';
import '../App.css';
import './Proposals.css';
import '../components/UnifiedTable.css';

function ProjectSheet() {
  const navigate = useNavigate();
  const toast = useToast();
  const { getProjects, getClients, getContacts } = useData();
  const [projectSheets, setProjectSheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  
  // New sheet creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [sheetTitle, setSheetTitle] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sheetsResponse, projectsData, clientsData, contactsData] = await Promise.all([
        api.json('/api/project-sheets'),
        getProjects(),
        getClients(),
        getContacts()
      ]);
      
      if (sheetsResponse.response.ok) {
        setProjectSheets(sheetsResponse.data || []);
      }
      setProjects(projectsData || []);
      setClients(clientsData || []);
      setContacts(contactsData || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    const project = projects.find(p => p.id === parseInt(selectedProject));
    if (!project) {
      toast.error('Selected project not found');
      return;
    }

    setGenerating(selectedProject);
    try {
      const { response, data } = await api.json(`/api/projects/${selectedProject}/sheet`, {
        method: 'POST',
        body: JSON.stringify({
          title: sheetTitle.trim() || `${project.name} - Project Sheet`
        })
      });

      if (response.ok) {
        toast.success('Project sheet created successfully');
        setShowCreateModal(false);
        resetCreateForm();
        // Refresh the sheets list to show new sheet
        loadData();
        // Navigate to the project sheet viewer
        navigate(`/project-sheet/${data.id}`);
      } else {
        toast.error('Failed to create project sheet');
      }
    } catch (error) {
      toast.error('Failed to create project sheet');
    } finally {
      setGenerating(null);
    }
  };

  const resetCreateForm = () => {
    setSelectedProject('');
    setSheetTitle('');
    setProjectSearch('');
  };

  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p.id === parseInt(projectId));
    setSelectedProject(projectId);
    // Auto-populate title with project name
    setSheetTitle(project ? `${project.name} - Project Sheet` : '');
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.client_name : 'N/A';
  };

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.contact_name : 'N/A';
  };

  const formatCurrency = (value) => {
    return value ? `$${value.toLocaleString()}` : 'N/A';
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  const handleRegenerateSheet = async (sheet) => {
    setGenerating(sheet.id);
    try {
      const { response, data } = await api.json(`/api/project-sheets/${sheet.id}/regenerate`, {
        method: 'PUT'
      });

      if (response.ok) {
        toast.success('Project sheet regenerated with current data');
        // Refresh the sheets list to show updated timestamp
        loadData();
      } else {
        toast.error('Failed to regenerate sheet');
      }
    } catch (error) {
      toast.error('Failed to regenerate sheet');
    } finally {
      setGenerating(null);
    }
  };

  const handleDeleteSheet = async (sheet) => {
    if (!window.confirm(`Are you sure you want to delete "${sheet.title}"? This action cannot be undone.`)) {
      return;
    }
    
    setDeleting(sheet.id);
    try {
      const { response } = await api.json(`/api/project-sheets/${sheet.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Project sheet deleted successfully');
        // Refresh the sheets list
        loadData();
      } else {
        toast.error('Failed to delete project sheet');
      }
    } catch (error) {
      toast.error('Failed to delete project sheet');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="loading-indicator">Loading projects...</div>;
  }

  return (
    <div className="proposals-page">
      <div className="proposals-header">
        <h1>Project Sheets</h1>
        <div className="header-actions">
          <button 
            className="button-primary"
            onClick={() => setShowCreateModal(true)}
          >
            New Sheet
          </button>
        </div>
      </div>

      {/* Generated Sheets Section */}
      <div className="unified-table-container">
        <h3 style={{ padding: '0 var(--space-lg)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
          Generated Sheets ({projectSheets.length})
        </h3>
        <div className="unified-grid-table">
          <div className="unified-grid-header sheets-list-grid">
            <div>Sheet Title</div>
            <div>Project</div>
            <div>Generated</div>
            <div>Actions</div>
          </div>
          
          {projectSheets.length === 0 ? (
            <div className="unified-grid-row">
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No project sheets generated yet. Generate your first sheet below.
              </div>
            </div>
          ) : (
            projectSheets.map((sheet) => (
              <div key={sheet.id} className="unified-grid-row sheets-list-grid">
                <div className="table-primary-text">{sheet.title}</div>
                <div className="table-secondary-text">{sheet.project_name}</div>
                <div className="table-secondary-text">{formatDate(sheet.created_at)}</div>
                <div className="table-actions">
                  <button 
                    className="button-primary"
                    onClick={() => navigate(`/project-sheet/${sheet.id}`)}
                  >
                    View
                  </button>
                  <button 
                    className="button-secondary"
                    onClick={() => handleRegenerateSheet(sheet)}
                    disabled={generating}
                  >
                    Regenerate
                  </button>
                  <button 
                    className="button-danger"
                    onClick={() => handleDeleteSheet(sheet)}
                    disabled={deleting === sheet.id}
                  >
                    {deleting === sheet.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Sheet Creation Modal */}
      {showCreateModal && (
        <Modal onClose={() => { setShowCreateModal(false); resetCreateForm(); }}>
          <div className="modal-header">
            <h2>Create New Project Sheet</h2>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label>Select Project *</label>
              <ProjectPicker
                projects={projects}
                clients={clients}
                value={selectedProject ? parseInt(selectedProject) : null}
                onChange={(projectId) => handleProjectSelect(projectId?.toString() || '')}
                placeholder="Search and select a project..."
              />
            </div>

            <div className="form-group">
              <label>Sheet Title</label>
              <input
                type="text"
                value={sheetTitle}
                onChange={(e) => setSheetTitle(e.target.value)}
                placeholder="Enter custom title or leave blank for default"
                maxLength={100}
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                Leave blank to use default: "{selectedProject ? projects.find(p => p.id === parseInt(selectedProject))?.name : '[Project Name]'} - Project Sheet"
              </small>
            </div>

          </div>

          <div className="modal-footer">
            <div className="form-actions">
              <button 
                className="button-primary" 
                onClick={handleCreateSheet}
                disabled={!selectedProject || generating}
              >
                {generating ? 'Creating...' : 'Create Project Sheet'}
              </button>
              <button 
                className="button-secondary" 
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                disabled={generating}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="page-footer" style={{ 
        textAlign: 'center', 
        padding: 'var(--space-lg)', 
        color: 'var(--text-secondary)',
        borderTop: '1px solid var(--border-light)',
        marginTop: 'var(--space-xl)'
      }}>
        <p>💡 <strong>Tip:</strong> Each generated sheet creates a snapshot. You can generate multiple sheets for the same project.</p>
        <p>Edit project details from the <strong>Projects</strong> page to improve sheet content.</p>
      </div>
    </div>
  );
}

export default ProjectSheet;