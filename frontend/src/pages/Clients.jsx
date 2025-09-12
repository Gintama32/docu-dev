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

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async (query) => {
    setLoading(true);
    try {
      const data = await getClients(query?.trim());
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!q.trim()) return items;
    const searchTerm = q.toLowerCase();
    return items.filter(item => 
      item.client_name?.toLowerCase().includes(searchTerm) ||
      item.website?.toLowerCase().includes(searchTerm) ||
      item.main_email?.toLowerCase().includes(searchTerm)
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
    setShowForm(true);
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
    setShowForm(true);
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
      setShowForm(false);
      resetForm();
      
      // Force refresh to show new client immediately
      await refreshClients();
      fetchList(q);

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
        fetchList(q);
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
    <div className="proposals-page">
      <div className="proposals-header">
        <h1>Clients</h1>
        <div className="header-actions">
          <button className="button-primary" onClick={handleCreate}>
            Add Client
          </button>
        </div>
      </div>

      <div className="proposals-filters">
        <div className="filter-group" style={{ minWidth: 240 }}>
          <label>Search</label>
          <input 
            type="search" 
            placeholder="Search clients..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            onKeyDown={(e) => { if(e.key === 'Enter') fetchList(q); }}
          />
        </div>
        <div className="filter-group" style={{ alignSelf: 'flex-end' }}>
          <button className="button-secondary" onClick={() => fetchList(q)} disabled={loading}>
            Apply
          </button>
        </div>
      </div>

      <div className="unified-table-container">
        <div className="unified-grid-table">
          <div className="unified-grid-header clients-grid">
            <div>Client Name</div>
            <div>Website</div>
            <div>Email</div>
            <div>Last Contact</div>
            <div>Actions</div>
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
                className="unified-grid-row clients-grid"
              >
                <div className="table-primary-text">{client.client_name}</div>
                <div className="table-secondary-text">
                  {client.website ? (
                    <a href={client.website} target="_blank" rel="noopener noreferrer">
                      {client.website}
                    </a>
                  ) : 'N/A'}
                </div>
                <div className="table-secondary-text">{client.main_email || 'N/A'}</div>
                <div className="table-secondary-text">{formatDate(client.last_contact_date)}</div>
                <div className="table-actions">
                  <button 
                    className="table-action-edit" 
                    onClick={() => handleEdit(client)}
                    title="Edit Client"
                  >
                    Edit
                  </button>
                  <button 
                    className="table-action-delete" 
                    onClick={() => setDeleteId(client.id)}
                    title="Delete Client"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit}>
            <h3>{editing ? 'Edit Client' : 'Add New Client'}</h3>
            
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