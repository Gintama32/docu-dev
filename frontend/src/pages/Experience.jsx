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
  const { getClients, getContacts } = useData();
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
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
      const url = query && query.trim() ? `/api/experiences?q=${encodeURIComponent(query.trim())}` : '/api/experiences';
      const { response, data } = await api.json(url);
      if (response.ok) setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

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

      <div className="proposals-filters">
        <div className="filter-group" style={{ minWidth: 240 }}>
          <label>Search</label>
          <input
            type="search"
            placeholder="Search experiences..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter') fetchList(q); }}
          />
        </div>
        <div className="filter-group">
          <label>Client</label>
          <select value={form.client_id} onChange={e=>setForm(f=>({...f, client_id: e.target.value}))}>
            <option value="">All clients</option>
            {clients.map(c => (<option key={c.id} value={c.id}>{c.client_name}</option>))}
          </select>
        </div>
        <div className="filter-group">
          <label>Contact</label>
          <select value={form.contact_id} onChange={e=>setForm(f=>({...f, contact_id: e.target.value}))}>
            <option value="">All contacts</option>
            {contacts.map(ct => (<option key={ct.id} value={ct.id}>{ct.contact_name}</option>))}
          </select>
        </div>
        <div className="filter-group" style={{ alignSelf: 'flex-end' }}>
          <button className="button-secondary" onClick={()=>fetchList(q)} disabled={loading}>Apply</button>
        </div>
      </div>

      <div className="proposals-list">
        <div className="proposals-table">
          <div className="table-header">
            <div>Name</div>
            <div>Client</div>
            <div>Location</div>
            <div>Start</div>
            <div>End</div>
            <div>Actions</div>
          </div>
          {items.map((item) => (
            <div key={item.id} className="table-row">
              <div className="proposal-name">
                <strong>{item.project_name}</strong>
              </div>
              <div>{clientMap[item.client_id] || '-'}</div>
              <div>{item.location || '-'}</div>
              <div>{item.date_started || '-'}</div>
              <div>{item.date_completed || '-'}</div>
              <div className="actions">
                <button className="button-secondary-small" onClick={() => onEdit(item)}>Edit</button>
                <button className="button-danger-small" onClick={() => onDelete(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <Modal onClose={() => { setShowForm(false); }} className="proposal-modal structured-modal">
          <div className="modal-header">
            <h2>{editing ? `Edit Experience` : 'Add Experience'}</h2>
          </div>
          <form onSubmit={onSubmit} className="proposal-form">
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Project Name</label>
                  <input required value={form.project_name} onChange={e=>setForm(f=>({...f, project_name: e.target.value}))} />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea rows="3" value={form.project_description} onChange={e=>setForm(f=>({...f, project_description: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Value (USD)</label>
                  <input type="number" step="0.01" value={form.project_value} onChange={e=>setForm(f=>({...f, project_value: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.date_started} onChange={e=>setForm(f=>({...f, date_started: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.date_completed} onChange={e=>setForm(f=>({...f, date_completed: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input value={form.location} onChange={e=>setForm(f=>({...f, location: e.target.value}))} />
                </div>
                <div className="form-group full-width">
                  <label>Tags (comma separated)</label>
                  <input value={form.tags} onChange={e=>setForm(f=>({...f, tags: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Client</label>
                  <select required value={form.client_id} onChange={e=>setForm(f=>({...f, client_id: e.target.value}))}>
                    <option value="">Select client…</option>
                    {clients.map(c => (<option key={c.id} value={c.id}>{c.client_name}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Contact (optional)</label>
                  <select value={form.contact_id} onChange={e=>setForm(f=>({...f, contact_id: e.target.value}))}>
                    <option value="">None</option>
                    {contacts.map(ct => (<option key={ct.id} value={ct.id}>{ct.contact_name}</option>))}
                  </select>
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