import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import MediaPicker from '../components/MediaPicker';
import MediaUpload from '../components/MediaUpload';
import MediaGallery from '../components/MediaGallery';
import '../App.css';
import './Proposals.css';
import '../components/UnifiedTable.css';

function Projects() {
  const toast = useToast();
  const { getProjects, refreshProjects } = useData();
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
  });
  
  // Media management states
  const [projectMedia, setProjectMedia] = useState([]);
  const [showMediaTab, setShowMediaTab] = useState(false);
  
  // Detail view state
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailViewMode, setDetailViewMode] = useState('view'); // 'view' or 'edit'

  useEffect(() => { fetchList(); }, []);

  const fetchList = async (query) => {
    setLoading(true);
    try {
      const data = await getProjects(query?.trim());
      setItems(data || []);
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', description: '', date: '', contract_value: '', main_image_id: '' });
    setProjectMedia([]);
    setShowMediaTab(false);
    setShowDetailView(false);
    setDetailViewMode('view');
  };

  // Load project media
  const loadProjectMedia = async (projectId) => {
    if (!projectId) return;
    
    try {
      const { response, data } = await api.json(`/api/media/projects/${projectId}`);
      if (response.ok) {
        setProjectMedia(data || []);
      } else {
        setProjectMedia([]);
      }
    } catch (error) {
      setProjectMedia([]);
    }
  };

  const handleMediaUploadComplete = (uploadedMedia) => {
    setProjectMedia(prev => [uploadedMedia, ...prev]);
    toast.success('Media uploaded successfully!');
  };

  const handleMediaDelete = (mediaId) => {
    setProjectMedia(prev => prev.filter(m => m.id !== mediaId));
    // If this was the main image, clear it
    if (form.main_image_id === mediaId) {
      setForm(f => ({ ...f, main_image_id: '' }));
    }
  };

  const onSubmit = async (e) => {
    if (e) e.preventDefault();
    
    const payload = {
      ...form,
      date: form.date || null,
      contract_value: form.contract_value ? parseFloat(form.contract_value) : null,
      main_image_id: form.main_image_id ? Number(form.main_image_id) : null,
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
      fetchList(q); 
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
    });
    
    // Load project media
    await loadProjectMedia(item.id);
    
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
    });
    
    // Load project media
    await loadProjectMedia(item.id);
    
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
      fetchList(q);
      toast.success('Project deleted');
    } else {
      toast.error('Failed to delete project');
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className={`proposals-page ${showDetailView ? 'with-side-panel' : ''}`}>
      <div className="projects-layout">
        <div className="projects-main">
          <div className="proposals-header">
            <h1>Projects</h1>
            <button className="button-primary" onClick={() => { 
              resetForm(); 
              setDetailViewMode('edit');
              setShowDetailView(true);
            }}>New Project</button>
          </div>

          <div className="proposals-filters">
            <div className="filter-group" style={{ minWidth: 240 }}>
              <label>Search</label>
              <input type="search" placeholder="Search projects..." value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') fetchList(q); }} />
            </div>
            <div className="filter-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e)=>setForm(f=>({...f, date: e.target.value}))} />
            </div>
            <div className="filter-group" style={{ alignSelf: 'flex-end' }}>
              <button className="button-secondary" onClick={()=>fetchList(q)} disabled={loading}>Apply</button>
            </div>
          </div>

          <div className="unified-table-container">
            <div className="unified-grid-table">
              <div className="unified-grid-header projects-grid">
                <div>Image</div>
                <div>Name</div>
                <div>Date</div>
                <div>Value</div>
                <div>Actions</div>
              </div>
              {items.map((item) => (
                <div key={item.id} className="unified-grid-row projects-grid">
                  <div onClick={() => onView(item)} style={{ cursor: 'pointer' }}>
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
                  <div className="table-primary-text" onClick={() => onView(item)} style={{ cursor: 'pointer' }}>
                    {item.name}
                  </div>
                  <div onClick={() => onView(item)} style={{ cursor: 'pointer' }}>
                    {item.date || '-'}
                  </div>
                  <div onClick={() => onView(item)} style={{ cursor: 'pointer' }}>
                    {item.contract_value ?? '-'}
                  </div>
                  <div className="table-actions">
                    <button className="table-action-view" onClick={(e) => { e.stopPropagation(); onView(item); }}>View</button>
                    <button className="table-action-edit" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>Edit</button>
                    <button className="table-action-delete" onClick={(e) => { e.stopPropagation(); onDelete(item); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail View Panel */}
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
                    <button 
                      className="button-primary"
                      onClick={() => setDetailViewMode('edit')}
                    >
                      Edit Project
                    </button>
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
              {editing && (
                <div className="detail-tabs">
                  <button 
                    className={!showMediaTab ? 'active' : ''}
                    onClick={() => setShowMediaTab(false)}
                  >
                    Details
                  </button>
                  <button 
                    className={showMediaTab ? 'active' : ''}
                    onClick={() => setShowMediaTab(true)}
                  >
                    Media ({projectMedia.length})
                  </button>
                </div>
              )}

              {!showMediaTab || !editing ? (
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
                        <div className="form-group full-width">
                          <label>Main Image</label>
                          <MediaPicker value={form.main_image_id} onChange={(id) => setForm(f => ({ ...f, main_image_id: id }))} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Media Tab
                <div className="project-media-content">
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <h3>Upload New Media</h3>
                    <MediaUpload
                      onUploadComplete={handleMediaUploadComplete}
                      entityType="project"
                      entityId={editing?.id}
                      mediaType="attachment"
                      accept="image/*"
                    />
                  </div>
                  
                  <div>
                    <h3>Project Media Gallery</h3>
                    {projectMedia.length > 0 ? (
                      <MediaGallery
                        media={projectMedia}
                        onDelete={handleMediaDelete}
                        showCaptions={true}
                      />
                    ) : (
                      <div className="empty-media-state">
                        No media uploaded for this project yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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