import React, { useEffect, useState } from 'react';
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
  const toast = useToast();
  const { getProjects, refreshProjects } = useData();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    contract_value: '',
    main_image_id: '',
  });

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
  };

  const onSubmit = async (e) => {
    e.preventDefault();
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
      resetForm(); 
      setShowForm(false); 
      await refreshProjects();
      fetchList(q); 
    }
  };

  const onEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      date: item.date || '',
      contract_value: item.contract_value ?? '',
      main_image_id: item.main_image_id || '',
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
    <div className="proposals-page">
      <div className="proposals-header">
        <h1>Projects</h1>
        <button className="button-primary" onClick={() => { resetForm(); setShowForm(true); }}>New Project</button>
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
            <div>Name</div>
            <div>Date</div>
            <div>Value</div>
            <div>Actions</div>
          </div>
          {items.map((item) => (
            <div key={item.id} className="unified-grid-row projects-grid">
              <div className="table-primary-text">{item.name}</div>
              <div>{item.date || '-'}</div>
              <div>{item.contract_value ?? '-'}</div>
              <div className="table-actions">
                <button className="table-action-edit" onClick={() => onEdit(item)}>Edit</button>
                <button className="table-action-delete" onClick={() => onDelete(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} className="structured-modal">
          <div className="modal-header">
            <h2>{editing ? 'Edit Project' : 'Add Project'}</h2>
          </div>
          <form onSubmit={onSubmit} className="proposal-form">
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Name</label>
                  <input required value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea rows="3" value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} />
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