import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import MediaPicker from '../components/MediaPicker';
import '../App.css';
import './Proposals.css';
import '../components/UnifiedTable.css';

function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
  const { getProjects, refreshProjects, getClients, getContacts } = useData();
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    contract_value: '',
    main_image_id: '',
    location: '',
    client_id: '',
    contact_id: '',
  });
  
  // Note: Media management removed - now handled via MediaPicker only
  
  // Detail view state
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailViewMode, setDetailViewMode] = useState('view'); // 'view' or 'edit'

  useEffect(() => { 
    fetchList(); 
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [clientsData, contactsData] = await Promise.all([
        getClients(),
        getContacts()
      ]);
      setClients(clientsData || []);
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getProjects(); // Get all projects, filter client-side
      setItems(data || []);
    } finally { setLoading(false); }
  };

  // Client-side filtering for better UX
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    if (!q.trim()) return items;
    
    const searchTerm = q.toLowerCase();
    return items.filter(item => 
      item.name?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm)
    );
  }, [items, q]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', description: '', date: '', contract_value: '', main_image_id: '', location: '', client_id: '', contact_id: '' });
    // Media tab removed
    setShowDetailView(false);
    setDetailViewMode('view');
  };

  // Media management simplified - handled via MediaPicker only

  const handleCreateProjectSheet = async (project) => {
    try {
      const { response, data } = await api.json(`/api/projects/${project.id}/sheet`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Project sheet created successfully');
        // Navigate to the project sheet viewer
        navigate(`/project-sheet/${data.id}`);
      } else {
        toast.error('Failed to create project sheet');
      }
    } catch (error) {
      toast.error('Failed to create project sheet');
    }
  };

  const onSubmit = async (e) => {
    if (e) e.preventDefault();
    
    const payload = {
      ...form,
      date: form.date || null,
      contract_value: form.contract_value ? parseFloat(form.contract_value) : null,
      main_image_id: form.main_image_id ? Number(form.main_image_id) : null,
      location: form.location || null,
      client_id: form.client_id ? Number(form.client_id) : null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
    };
    const url = editing ? `/api/projects/${editing.id}` : '/api/projects';
    const method = editing ? 'PUT' : 'POST';
    const response = await api.request(url, { method, body: JSON.stringify(payload) });
    if (response.ok) { 
      if (editing && showDetailView) {
        // Update the editing object with new data for detail view
        setEditing({ ...editing, ...payload });
        // Switch back to view mode
        setDetailViewMode('view');
        toast.success('Project updated successfully');
      } else {
        resetForm(); 
        setShowForm(false); 
      }
      await refreshProjects();
      fetchList(); 
    }
  };

  const onEdit = async (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      date: item.date || '',
      contract_value: item.contract_value ?? '',
      main_image_id: item.main_image_id || '',
      location: item.location || '',
      client_id: item.client_id || '',
      contact_id: item.contact_id || '',
    });
    
    // Media loading removed - handled by MediaPicker
    
    // Show detail view in edit mode
    setDetailViewMode('edit');
    setShowDetailView(true);
  };

  // New function to view project details
  const onView = async (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      date: item.date || '',
      contract_value: item.contract_value ?? '',
      main_image_id: item.main_image_id || '',
      location: item.location || '',
      client_id: item.client_id || '',
      contact_id: item.contact_id || '',
    });
    
    // Media loading removed - handled by MediaPicker
    
    // Show detail view in view mode
    setDetailViewMode('view');
    setShowDetailView(true);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const onDelete = async (item) => {
    setConfirmDeleteId(item.id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    const response = await api.request(`/api/projects/${id}`, { method: 'DELETE' });
    if (response.ok) {
      if (editing?.id === id) resetForm();
      await refreshProjects();
      fetchList();
      toast.success('Project deleted');
    } else {
      toast.error('Failed to delete project');
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className={`proposals-page ${showDetailView ? 'with-side-panel' : ''}`}>
      <div className="projects-layout">
        {/* Header spans full width */}
        <div className="proposals-header">
          <h1>Projects</h1>
          <button className="button-primary" onClick={() => { 
            resetForm(); 
            setDetailViewMode('edit');
            setShowDetailView(true);
          }}>New Project</button>
        </div>

        {/* Filters span full width */}
        <div className="proposals-filters">
          <div className="filter-group" style={{ minWidth: 240 }}>
            <label>Search</label>
            <input 
              type="search" 
              placeholder="Search projects..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
            />
          </div>
          <div className="filter-group" style={{ alignSelf: 'flex-end' }}>
            <button 
              className="button-secondary" 
              onClick={() => setQ('')} 
              disabled={!q.trim()}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results count spans full width */}
        <div className="results-info" style={{ padding: '0 var(--space-lg)', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Showing {filteredItems.length} of {items.length} projects
        </div>

        {/* Content area: table + detail view split */}
        <div className={showDetailView ? 'content-with-detail' : ''}>
          <div className="projects-main">
            <div className="unified-table-container">
            <div className="unified-grid-table">
              <div className={`unified-grid-header ${showDetailView ? 'projects-grid-compact' : 'projects-grid'}`}>
                <div>Image</div>
                <div>Name</div>
                {!showDetailView && <div>Date</div>}
                {!showDetailView && <div>Value</div>}
                {!showDetailView && <div>Actions</div>}
              </div>
              {filteredItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`unified-grid-row ${showDetailView ? 'projects-grid-compact' : 'projects-grid'} ${editing?.id === item.id && showDetailView ? 'selected-row' : ''}`}
                  onClick={() => showDetailView ? onView(item) : undefined}
                  style={{ cursor: showDetailView ? 'pointer' : 'default' }}
                >
                  <div onClick={!showDetailView ? () => onView(item) : undefined} style={{ cursor: !showDetailView ? 'pointer' : 'inherit' }}>
                    {item.main_image_id ? (
                      <img
                        src={`${import.meta?.env?.VITE_API_BASE || 'http://localhost:8001'}/api/media/${item.main_image_id}/raw`}
                        alt="Project"
                        style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-light)' }}
                      />
                    ) : (
                      <div style={{ width: 60, height: 40, background: 'var(--background-secondary)', border: '1px solid var(--border-light)', borderRadius: 4 }} />
                    )}
                  </div>
                  <div 
                    className="table-primary-text"
                    onClick={!showDetailView ? () => onView(item) : undefined}
                    style={{ cursor: !showDetailView ? 'pointer' : 'inherit' }}
                  >
                    {item.name}
                  </div>
                  {!showDetailView && (
                    <div onClick={() => onView(item)} style={{ cursor: 'pointer' }}>
                      {item.date || '-'}
                    </div>
                  )}
                  {!showDetailView && (
                    <div onClick={() => onView(item)} style={{ cursor: 'pointer' }}>
                      {item.contract_value ?? '-'}
                    </div>
                  )}
                  {!showDetailView && (
                    <div className="table-actions">
                      <button className="table-action-view" onClick={(e) => { e.stopPropagation(); onView(item); }}>View</button>
                      <button className="table-action-edit" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>Edit</button>
                      <button className="table-action-delete" onClick={(e) => { e.stopPropagation(); onDelete(item); }}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          </div>

          {/* Detail View Panel - 80% width */}
          {showDetailView && (
          <div className="project-detail-panel">
            <div className="detail-panel-header">
              <div className="detail-panel-title">
                <h2>{editing ? editing.name : 'New Project'}</h2>
                <div className="detail-panel-actions">
                  {!editing ? (
                    // New project mode
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button 
                        className="button-secondary"
                        onClick={() => setShowDetailView(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="button-primary"
                        onClick={onSubmit}
                      >
                        Create Project
                      </button>
                    </div>
                  ) : detailViewMode === 'view' ? (
                    // View mode for existing project
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button 
                        className="button-primary"
                        onClick={() => setDetailViewMode('edit')}
                      >
                        Edit Project
                      </button>
                      <button 
                        className="button-secondary"
                        onClick={() => handleCreateProjectSheet(editing)}
                      >
                        Create Sheet
                      </button>
                      <button 
                        className="button-danger"
                        onClick={() => setConfirmDeleteId(editing.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    // Edit mode for existing project
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button 
                        className="button-secondary"
                        onClick={() => setDetailViewMode('view')}
                      >
                        Cancel
                      </button>
                      <button 
                        className="button-primary"
                        onClick={onSubmit}
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                  <button 
                    className="button-tertiary"
                    onClick={() => setShowDetailView(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-panel-content">
                <div className="project-details-content">
                  {!editing ? (
                    // New Project Mode
                    <div className="project-edit-form">
                      <div className="form-grid">
                        <div className="form-group full-width">
                          <label>Name</label>
                          <input required value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} placeholder="Enter project name" />
                        </div>
                        <div className="form-group full-width">
                          <label>Description</label>
                          <textarea rows="4" value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} placeholder="Describe the project..." />
                        </div>
                        <div className="form-group">
                          <label>Date</label>
                          <input type="date" value={form.date} onChange={e=>setForm(f=>({...f, date: e.target.value}))} />
                        </div>
                        <div className="form-group">
                          <label>Contract Value</label>
                          <input type="number" step="0.01" value={form.contract_value} onChange={e=>setForm(f=>({...f, contract_value: e.target.value}))} placeholder="0.00" />
                        </div>
                        <div className="form-group full-width">
                          <label>Main Image</label>
                          <MediaPicker value={form.main_image_id} onChange={(id) => setForm(f => ({ ...f, main_image_id: id }))} />
                        </div>
                      </div>
                    </div>
                  ) : detailViewMode === 'view' ? (
                    // View Mode
                    <div className="project-info">
                      <div className="info-section">
                        <h3>Project Information</h3>
                        <div className="info-grid">
                          <div className="info-item">
                            <label>Name</label>
                            <p>{editing.name}</p>
                          </div>
                          <div className="info-item">
                            <label>Date</label>
                            <p>{editing.date || 'Not specified'}</p>
                          </div>
                          <div className="info-item">
                            <label>Contract Value</label>
                            <p>{editing.contract_value ? `$${editing.contract_value.toLocaleString()}` : 'Not specified'}</p>
                          </div>
                          <div className="info-item">
                            <label>Location</label>
                            <p>{editing.location || 'Not specified'}</p>
                          </div>
                          <div className="info-item">
                            <label>Client</label>
                            <p>{editing.client_id ? clients.find(c => c.id === editing.client_id)?.client_name : 'Not specified'}</p>
                          </div>
                          <div className="info-item">
                            <label>Contact</label>
                            <p>{editing.contact_id ? contacts.find(c => c.id === editing.contact_id)?.contact_name : 'Not specified'}</p>
                          </div>
                          <div className="info-item full-width">
                            <label>Description</label>
                            <p>{editing.description || 'No description provided'}</p>
                          </div>
                          {editing.main_image_id && (
                            <div className="info-item full-width">
                              <label>Main Image</label>
                              <img
                                src={`${import.meta?.env?.VITE_API_BASE || 'http://localhost:8001'}/api/media/${editing.main_image_id}/raw`}
                                alt="Main project image"
                                style={{ maxWidth: 300, borderRadius: 8, border: '1px solid var(--border-light)' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Edit Mode
                    <div className="project-edit-form">
                      <div className="form-grid">
                        <div className="form-group full-width">
                          <label>Name</label>
                          <input required value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} />
                        </div>
                        <div className="form-group full-width">
                          <label>Description</label>
                          <textarea rows="4" value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} />
                        </div>
                        <div className="form-group">
                          <label>Date</label>
                          <input type="date" value={form.date} onChange={e=>setForm(f=>({...f, date: e.target.value}))} />
                        </div>
                        <div className="form-group">
                          <label>Contract Value</label>
                          <input type="number" step="0.01" value={form.contract_value} onChange={e=>setForm(f=>({...f, contract_value: e.target.value}))} />
                        </div>
                        <div className="form-group">
                          <label>Location</label>
                          <input value={form.location} onChange={e=>setForm(f=>({...f, location: e.target.value}))} placeholder="Project location" />
                        </div>
                        <div className="form-group">
                          <label>Client</label>
                          <select value={form.client_id} onChange={e=>setForm(f=>({...f, client_id: e.target.value}))}>
                            <option value="">Select client...</option>
                            {clients.map(c => (<option key={c.id} value={c.id}>{c.client_name}</option>))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Contact</label>
                          <select value={form.contact_id} onChange={e=>setForm(f=>({...f, contact_id: e.target.value}))}>
                            <option value="">Select contact...</option>
                            {contacts.map(c => (<option key={c.id} value={c.id}>{c.contact_name}</option>))}
                          </select>
                        </div>
                        <div className="form-group full-width">
                          <label>Main Image</label>
                          <MediaPicker 
                            value={form.main_image_id} 
                            onChange={(id) => setForm(f => ({ ...f, main_image_id: id }))} 
                            mediaType="project"
                            showFilters={false}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </div>
          )}
        </div>
      </div>


      <Confirm
        open={!!confirmDeleteId}
        title="Delete project?"
        message="This action cannot be undone."
        destructive
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default Projects;