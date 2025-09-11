import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import '../App.css';
import './Proposals.css';

function Experience() {
  const toast = useToast();
  const { getClients, getContacts, getExperiences, refreshExperiences } = useData();
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Filter states
  const [clientFilter, setClientFilter] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [form, setForm] = useState({
    project_name: '',
    project_description: '',
    project_value: '',
    date_started: '',
    date_completed: '',
    location: '',
    tags: '',
    client_id: '',
    contact_id: '',
  });

  useEffect(() => {
    // load supporting data
    (async () => {
      const [c, ct] = await Promise.all([getClients(), getContacts()]);
      setClients(c || []);
      setContacts(ct || []);
    })();
    fetchList();
  }, []);

  const fetchList = async (query) => {
    setLoading(true);
    try {
      const data = await getExperiences(query?.trim());
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      const matchesSearch = !q.trim() || 
        item.project_name?.toLowerCase().includes(q.toLowerCase()) ||
        item.project_description?.toLowerCase().includes(q.toLowerCase()) ||
        item.location?.toLowerCase().includes(q.toLowerCase());
      
      const matchesClient = !clientFilter || item.client_id === parseInt(clientFilter);
      const matchesContact = !contactFilter || item.contact_id === parseInt(contactFilter);
      
      return matchesSearch && matchesClient && matchesContact;
    });
  }, [items, q, clientFilter, contactFilter]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      project_name: '',
      project_description: '',
      project_value: '',
      date_started: '',
      date_completed: '',
      location: '',
      tags: '',
      client_id: '',
      contact_id: '',
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      project_value: form.project_value ? parseFloat(form.project_value) : null,
      client_id: form.client_id ? Number(form.client_id) : null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      date_started: form.date_started || null,
      date_completed: form.date_completed || null,
    };
    const url = editing ? `/api/experiences/${editing.id}` : '/api/experiences';
    const method = editing ? 'PUT' : 'POST';
    const response = await api.request(url, { method, body: JSON.stringify(payload) });
    if (response.ok) {
      resetForm();
      setShowForm(false);
      fetchList(q);
    }
  };

  const onEdit = (item) => {
    setEditing(item);
    setForm({
      project_name: item.project_name || '',
      project_description: item.project_description || '',
      project_value: item.project_value ?? '',
      date_started: item.date_started || '',
      date_completed: item.date_completed || '',
      location: item.location || '',
      tags: item.tags || '',
      client_id: item.client_id || '',
      contact_id: item.contact_id || '',
    });
    setShowForm(true);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const onDelete = async (item) => {
    setConfirmDeleteId(item.id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    const response = await api.request(`/api/experiences/${id}`, { method: 'DELETE' });
    if (response.ok) {
      if (editing?.id === id) resetForm();
      fetchList(q);
      toast.success('Experience deleted');
    } else {
      toast.error('Failed to delete experience');
    }
    setConfirmDeleteId(null);
  };

  const clientMap = useMemo(() => Object.fromEntries((clients || []).map(c => [c.id, c.client_name])), [clients]);
  const contactMap = useMemo(() => Object.fromEntries((contacts || []).map(c => [c.id, c.contact_name])), [contacts]);

  return (
    <div className="proposals-page">
      <div className="proposals-header">
        <h1>Experiences</h1>
        <button className="button-primary" onClick={() => { resetForm(); setShowForm(true); }}>New Experience</button>
      </div>

      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="search"
              placeholder="Search experiences..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Client:</label>
            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="">All Clients</option>
              {clients.map(c => (<option key={c.id} value={c.id}>{c.client_name}</option>))}
            </select>
          </div>
          <div className="filter-group">
            <label>Contact:</label>
            <select value={contactFilter} onChange={(e) => setContactFilter(e.target.value)}>
              <option value="">All Contacts</option>
              {contacts.map(ct => (<option key={ct.id} value={ct.id}>{ct.contact_name}</option>))}
            </select>
          </div>
          <button 
            className="button-secondary" 
            onClick={() => {
              setQ('');
              setClientFilter('');
              setContactFilter('');
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Results count */}
      <div className="results-info">
        Showing {filteredItems.length} of {items.length} experiences
      </div>

      {/* Desktop Table View */}
      <div className="desktop-resume-table">
        <div className="unified-table-container">
          <div className="unified-grid-table">
            <div className="unified-grid-header experience-grid">
              <div>Project Name</div>
              <div>Details</div>
              <div>Duration</div>
              <div>Actions</div>
            </div>
            
            {filteredItems.length === 0 ? (
              <div className="unified-grid-row">
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {items.length === 0 ? 'No experiences found. Add your first experience!' : 'No experiences match your filters.'}
                </div>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="unified-grid-row experience-grid">
                <div className="table-primary-text">
                  <strong>{item.project_name}</strong>
                  {item.project_description && (
                    <div className="project-description">
                      {item.project_description.length > 100 
                        ? item.project_description.substring(0, 100) + '...'
                        : item.project_description
                      }
                    </div>
                  )}
                </div>
                <div className="table-secondary-text">
                  <div className="experience-details">
                    {clientMap[item.client_id] && (
                      <div className="detail-item">
                        <span className="detail-label">Client:</span> {clientMap[item.client_id]}
                      </div>
                    )}
                    {item.location && (
                      <div className="detail-item">
                        <span className="detail-label">Location:</span> {item.location}
                      </div>
                    )}
                    {item.project_value && (
                      <div className="detail-item">
                        <span className="detail-label">Value:</span> ${parseFloat(item.project_value).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="table-secondary-text">
                  <div className="date-range">
                    {item.date_started || 'N/A'} - {item.date_completed || 'Ongoing'}
                  </div>
                </div>
                <div className="table-actions">
                  <button className="table-action-edit" onClick={() => onEdit(item)}>Edit</button>
                  <button className="table-action-delete" onClick={() => onDelete(item)}>Delete</button>
                </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <Modal onClose={() => { setShowForm(false); }} className="proposal-modal structured-modal">
          <div className="modal-header">
            <h2>{editing ? `Edit Experience` : 'Add Experience'}</h2>
          </div>
          <form onSubmit={onSubmit} className="proposal-form">
            <div className="modal-body">
              <div className="experience-form-layout">
                {/* Primary Content Section */}
                <div className="primary-fields">
                  <div className="form-group">
                    <label>Project Name *</label>
                    <input 
                      required 
                      value={form.project_name} 
                      onChange={e=>setForm(f=>({...f, project_name: e.target.value}))}
                      placeholder="Enter the project name"
                    />
                  </div>
                  
                  <div className="form-group description-group">
                    <label>Description</label>
                    <textarea 
                      rows="12" 
                      value={form.project_description} 
                      onChange={e=>setForm(f=>({...f, project_description: e.target.value}))}
                      placeholder="Describe the project scope, your role, key achievements, technologies used, impact, etc. This is the main content that will appear in resumes."
                      className="description-textarea"
                    />
                  </div>
                </div>

                {/* Secondary Fields - Compact Layout */}
                <div className="secondary-fields">
                  <div className="compact-row">
                    <div className="form-group">
                      <label>Client *</label>
                      <select required value={form.client_id} onChange={e=>setForm(f=>({...f, client_id: e.target.value}))}>
                        <option value="">Select client…</option>
                        {clients.map(c => (<option key={c.id} value={c.id}>{c.client_name}</option>))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Contact</label>
                      <select value={form.contact_id} onChange={e=>setForm(f=>({...f, contact_id: e.target.value}))}>
                        <option value="">None</option>
                        {contacts.map(ct => (<option key={ct.id} value={ct.id}>{ct.contact_name}</option>))}
                      </select>
                    </div>
                  </div>

                  <div className="compact-row">
                    <div className="form-group">
                      <label>Start Date</label>
                      <input type="date" value={form.date_started} onChange={e=>setForm(f=>({...f, date_started: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input type="date" value={form.date_completed} onChange={e=>setForm(f=>({...f, date_completed: e.target.value}))} />
                    </div>
                  </div>

                  <div className="compact-row">
                    <div className="form-group">
                      <label>Location</label>
                      <input 
                        value={form.location} 
                        onChange={e=>setForm(f=>({...f, location: e.target.value}))}
                        placeholder="City, State/Country" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Value (USD)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={form.project_value} 
                        onChange={e=>setForm(f=>({...f, project_value: e.target.value}))}
                        placeholder="Project value"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tags</label>
                    <input 
                      value={form.tags} 
                      onChange={e=>setForm(f=>({...f, tags: e.target.value}))}
                      placeholder="hospital, renovation, infrastructure (comma separated)"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div className="form-actions">
                <button className="button-primary" type="submit">{editing ? 'Save' : 'Create'}</button>
                <button className="button-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      <Confirm
        open={!!confirmDeleteId}
        title="Delete experience?"
        message="This action cannot be undone."
        destructive
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default Experience;