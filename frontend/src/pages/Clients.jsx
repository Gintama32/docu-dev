import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import '../App.css';
import './Proposals.css';
import '../components/UnifiedTable.css';

function Clients() {
  const toast = useToast();
  const { getClients, refreshClients } = useData();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({
    client_name: '',
    website: '',
    main_email: '',
    main_phone: '',
    last_contact_date: '',
    last_project_date: '',
    main_contact_id: null,
  });
  
  // Detail view state (like Projects)
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailViewMode, setDetailViewMode] = useState('view'); // 'view' or 'edit'

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getClients(); // Get all clients, filter client-side
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for better UX (moved to be with other logic)
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    if (!q.trim()) return items;
    
    const searchTerm = q.toLowerCase();
    return items.filter(item => 
      item.client_name?.toLowerCase().includes(searchTerm) ||
      item.website?.toLowerCase().includes(searchTerm) ||
      item.main_email?.toLowerCase().includes(searchTerm) ||
      item.main_phone?.toLowerCase().includes(searchTerm)
    );
  }, [items, q]);

  const resetForm = () => {
    setForm({
      client_name: '',
      website: '',
      main_email: '',
      main_phone: '',
      last_contact_date: '',
      last_project_date: '',
      main_contact_id: null,
    });
    setEditing(null);
  };

  const handleCreate = () => {
    resetForm();
    setEditing(null); // No existing client
    setDetailViewMode('edit');
    setShowDetailView(true);
  };

  const handleEdit = (client) => {
    setForm({
      client_name: client.client_name || '',
      website: client.website || '',
      main_email: client.main_email || '',
      main_phone: client.main_phone || '',
      last_contact_date: client.last_contact_date || '',
      last_project_date: client.last_project_date || '',
      main_contact_id: client.main_contact_id || null,
    });
    setEditing(client);
    setDetailViewMode('edit');
    setShowDetailView(true);
  };

  const handleView = (client) => {
    setForm({
      client_name: client.client_name || '',
      website: client.website || '',
      main_email: client.main_email || '',
      main_phone: client.main_phone || '',
      last_contact_date: client.last_contact_date || '',
      last_project_date: client.last_project_date || '',
      main_contact_id: client.main_contact_id || null,
    });
    setEditing(client);
    setDetailViewMode('view');
    setShowDetailView(true);
  };

  const resetDetailView = () => {
    setEditing(null);
    setShowDetailView(false);
    setDetailViewMode('view');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up form data
      const cleanedForm = {
        client_name: form.client_name?.trim(),
        website: form.website?.trim() || null,
        main_email: form.main_email?.trim() || null,
        main_phone: form.main_phone?.trim() || null,
        last_contact_date: form.last_contact_date || null,
        last_project_date: form.last_project_date || null,
        main_contact_id: form.main_contact_id || null,
      };
      
      const response = editing 
        ? await api.request(`/api/clients/${editing.id}`, {
            method: 'PUT',
            body: JSON.stringify(cleanedForm)
          })
        : await api.request('/api/clients', {
            method: 'POST',
            body: JSON.stringify(cleanedForm)
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        throw new Error(errorData.detail || 'Failed to save client');
      }

      const clientData = await response.json();

      toast.success(editing ? 'Client updated successfully' : 'Client created successfully');
      
      if (editing) {
        // Update the editing object and switch to view mode
        setEditing({ ...editing, ...cleanedForm });
        setDetailViewMode('view');
      } else {
        // New client created, close detail view
        resetDetailView();
      }
      
      // Force refresh to show new client immediately
      await refreshClients();
      fetchList();

    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const response = await api.request(`/api/clients/${deleteId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Client deleted successfully');
        await refreshClients();
        fetchList();
      } else {
        toast.error('Failed to delete client');
      }
    } catch (error) {
      toast.error('Failed to delete client: ' + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`proposals-page ${showDetailView ? 'with-side-panel' : ''}`}>
      <div className="clients-layout">
        {/* Header spans full width */}
        <div className="proposals-header">
          <h1>Clients</h1>
          <div className="header-actions">
            <button className="button-primary" onClick={handleCreate}>
              Add Client
            </button>
          </div>
        </div>

        {/* Filters span full width */}
        <div className="proposals-filters">
          <div className="filter-group" style={{ minWidth: 240 }}>
            <label>Search</label>
            <input 
              type="search" 
              placeholder="Search clients..." 
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
          Showing {filteredItems.length} of {items.length} clients
        </div>

        {/* Content area: table + detail view split */}
        <div className={showDetailView ? 'content-with-detail' : ''}>
          <div className="clients-main">
            <div className="unified-table-container">
            <div className="unified-grid-table">
              <div className={`unified-grid-header ${showDetailView ? 'clients-grid-compact' : 'clients-grid'}`}>
                <div>Client Name</div>
                {!showDetailView && <div>Email</div>}
                {!showDetailView && <div>Last Contact</div>}
                {!showDetailView && <div>Actions</div>}
              </div>
          
          {filteredItems.length === 0 ? (
            <div className="unified-grid-row">
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                {items.length === 0 ? 'No clients found. Add your first client!' : 'No clients match your search.'}
              </div>
            </div>
          ) : (
            filteredItems.map((client) => (
              <div 
                key={client.id} 
                className={`unified-grid-row ${showDetailView ? 'clients-grid-compact' : 'clients-grid'} ${editing?.id === client.id && showDetailView ? 'selected-row' : ''}`}
                onClick={() => handleView(client)}
                style={{ cursor: 'pointer' }}
              >
                <div className="table-primary-text">
                  {client.client_name}
                </div>
                {!showDetailView && (
                  <div className="table-secondary-text">
                    {client.main_email || 'N/A'}
                  </div>
                )}
                {!showDetailView && (
                  <div className="table-secondary-text">
                    {formatDate(client.last_contact_date)}
                  </div>
                )}
                {!showDetailView && (
                  <div className="table-actions">
                    <button className="table-action-view" onClick={(e) => { e.stopPropagation(); handleView(client); }}>View</button>
                    <button className="table-action-edit" onClick={(e) => { e.stopPropagation(); handleEdit(client); }}>Edit</button>
                    <button className="table-action-delete" onClick={(e) => { e.stopPropagation(); setDeleteId(client.id); }}>Delete</button>
                  </div>
                )}
              </div>
            ))
          )}
              </div>
            </div>
          </div>

          {/* Client Detail View Panel - 80% width */}
          {showDetailView && (
          <div className="project-detail-panel">
            <div className="detail-panel-header">
              <div className="detail-panel-title">
                <h2>{editing ? editing.client_name : 'New Client'}</h2>
                <div className="detail-panel-actions">
                  {!editing ? (
                    // New client mode
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button 
                        className="button-secondary"
                        onClick={resetDetailView}
                      >
                        Cancel
                      </button>
                      <button 
                        className="button-primary"
                        onClick={handleSubmit}
                      >
                        Create Client
                      </button>
                    </div>
                  ) : detailViewMode === 'view' ? (
                    // View mode for existing client
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button 
                        className="button-primary"
                        onClick={() => setDetailViewMode('edit')}
                      >
                        Edit Client
                      </button>
                      <button 
                        className="button-danger"
                        onClick={() => setDeleteId(editing.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    // Edit mode for existing client
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button 
                        className="button-secondary"
                        onClick={() => setDetailViewMode('view')}
                      >
                        Cancel
                      </button>
                      <button 
                        className="button-primary"
                        onClick={handleSubmit}
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                  <button 
                    className="button-tertiary"
                    onClick={resetDetailView}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-panel-content">
              {!editing || detailViewMode === 'edit' ? (
                // Edit Mode (for new client or editing existing)
                <div className="client-edit-form">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Client Name *</label>
                      <input
                        type="text"
                        value={form.client_name}
                        onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                        required
                        placeholder="Enter client name"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Website</label>
                      <input
                        type="url"
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Main Email</label>
                      <input
                        type="email"
                        value={form.main_email}
                        onChange={(e) => setForm({ ...form, main_email: e.target.value })}
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Main Phone</label>
                      <input
                        type="tel"
                        value={form.main_phone}
                        onChange={(e) => setForm({ ...form, main_phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Contact Date</label>
                      <input
                        type="date"
                        value={form.last_contact_date}
                        onChange={(e) => setForm({ ...form, last_contact_date: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Project Date</label>
                      <input
                        type="date"
                        value={form.last_project_date}
                        onChange={(e) => setForm({ ...form, last_project_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="client-info">
                  <div className="info-section">
                    <h3>Client Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Client Name</label>
                        <p>{editing.client_name}</p>
                      </div>
                      <div className="info-item">
                        <label>Website</label>
                        <p>
                          {editing.website ? (
                            <a href={editing.website} target="_blank" rel="noopener noreferrer">
                              {editing.website}
                            </a>
                          ) : 'Not specified'}
                        </p>
                      </div>
                      <div className="info-item">
                        <label>Main Email</label>
                        <p>{editing.main_email || 'Not specified'}</p>
                      </div>
                      <div className="info-item">
                        <label>Main Phone</label>
                        <p>{editing.main_phone || 'Not specified'}</p>
                      </div>
                      <div className="info-item">
                        <label>Last Contact Date</label>
                        <p>{formatDate(editing.last_contact_date)}</p>
                      </div>
                      <div className="info-item">
                        <label>Last Project Date</label>
                        <p>{formatDate(editing.last_project_date)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Modal for mobile devices only */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} className="mobile-only-modal">
          <form onSubmit={handleSubmit}>
            <h3>Add New Client</h3>
            
            <div className="form-group">
              <label>Client Name *</label>
              <input
                type="text"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                required
                placeholder="Enter client name"
              />
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label>Main Email</label>
              <input
                type="email"
                value={form.main_email}
                onChange={(e) => setForm({ ...form, main_email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>

            <div className="form-group">
              <label>Main Phone</label>
              <input
                type="tel"
                value={form.main_phone}
                onChange={(e) => setForm({ ...form, main_phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="form-group">
              <label>Last Contact Date</label>
              <input
                type="date"
                value={form.last_contact_date}
                onChange={(e) => setForm({ ...form, last_contact_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Last Project Date</label>
              <input
                type="date"
                value={form.last_project_date}
                onChange={(e) => setForm({ ...form, last_project_date: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="button-primary" disabled={loading}>
                {loading ? 'Saving...' : (editing ? 'Update Client' : 'Create Client')}
              </button>
              <button 
                type="button" 
                className="button-secondary" 
                onClick={() => setShowForm(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Confirm
        open={!!deleteId}
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          handleDelete();
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
        title="Delete Client"
        message="Are you sure you want to delete this client? This action cannot be undone."
      />
    </div>
  );
}

export default Clients;