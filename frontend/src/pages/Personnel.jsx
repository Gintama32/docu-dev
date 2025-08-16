import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import MediaPicker from '../components/MediaPicker';
import '../App.css';
import './Proposals.css';

function Personnel() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState({
    user_id: '',
    main_image_id: '',
    intro: '',
    certificates: '', // JSON or comma separated
  });

  useEffect(() => {
    if (user?.id) setForm(f => ({ ...f, user_id: user.id }));
    fetchList();
  }, [user?.id]);

  const fetchList = async (query) => {
    setLoading(true);
    try {
      const url = query && query.trim() ? `/api/user-profiles?q=${encodeURIComponent(query.trim())}` : '/api/user-profiles';
      const { response, data } = await api.json(url);
      if (response.ok) setItems(data || []);
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ user_id: user?.id || '', main_image_id: '', intro: '', certificates: '' });
  };

  const normalizeCertificates = (raw) => {
    if (!raw) return null;
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [parsed]; } catch (_) {}
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      user_id: Number(form.user_id),
      main_image_id: form.main_image_id ? Number(form.main_image_id) : null,
      intro: form.intro || null,
      certificates: normalizeCertificates(form.certificates),
    };
    const url = editing ? `/api/user-profiles/${editing.id}` : '/api/user-profiles';
    const method = editing ? 'PUT' : 'POST';
    const response = await api.request(url, { method, body: JSON.stringify(payload) });
    if (response.ok) { resetForm(); setShowForm(false); fetchList(q); }
  };

  const onEdit = (item) => {
    setEditing(item);
    setForm({
      user_id: item.user_id || user?.id || '',
      main_image_id: item.main_image_id || '',
      intro: item.intro || '',
      certificates: item.certificates ? JSON.stringify(item.certificates) : '',
    });
    setShowForm(true);
  };

  const onDelete = async (item) => {
    setConfirmDeleteId(item.id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    const response = await api.request(`/api/user-profiles/${id}`, { method: 'DELETE' });
    if (response.ok) {
      if (editing?.id === id) resetForm();
      fetchList(q);
      toast.success('Profile deleted');
    } else {
      toast.error('Failed to delete profile');
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="proposals-page">
      <div className="proposals-header">
        <h1>User Profiles</h1>
        <button className="button-primary" onClick={() => { resetForm(); setShowForm(true); }}>New Profile</button>
      </div>

      <div className="proposals-filters">
        <div className="filter-group" style={{ minWidth: 240 }}>
          <label>Search</label>
          <input className="search-field" type="search" placeholder="Search profiles..." value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') fetchList(q); }} />
        </div>
        <div className="filter-group" style={{ alignSelf: 'flex-end' }}>
          <button className="button-secondary" onClick={()=>fetchList(q)} disabled={loading}>Apply</button>
        </div>
      </div>

      <div className="proposals-list">
        <div className="proposals-table">
          <div className="table-header" style={{ gridTemplateColumns: '120px 1fr 1fr' }}>
            <div>Image</div>
            <div>Intro</div>
            <div>Actions</div>
          </div>
          {items.map((item) => (
            <div key={item.id} className="table-row" style={{ gridTemplateColumns: '120px 1fr 1fr' }}>
              <div>
                {item.main_image_id ? (
                  <img
                    src={`/api/media/${item.main_image_id}/raw`}
                    alt="Profile"
                    style={{ width: 100, height: 68, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-light)' }}
                  />
                ) : (
                  <div style={{ width: 100, height: 68, background: 'var(--background-secondary)', border: '1px solid var(--border-light)', borderRadius: 6 }} />
                )}
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.intro || '-'}
              </div>
              <div className="actions">
                <button className="button-secondary-small" onClick={() => onEdit(item)}>Edit</button>
                <button className="button-danger-small" onClick={() => onDelete(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} className="proposal-modal structured-modal">
          <div className="modal-header">
            <h2>{editing ? 'Edit User Profile' : 'Add User Profile'}</h2>
          </div>
          <form onSubmit={onSubmit} className="proposal-form">
            <div className="modal-body">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
                <div className="form-group full-width" style={{ gridColumn: '1 / span 1' }}>
                  <label>Main Image</label>
                  <MediaPicker
                    value={form.main_image_id}
                    onChange={(id) => setForm(f => ({ ...f, main_image_id: id }))}
                  />
                </div>
                <div className="form-group full-width" style={{ gridColumn: '2 / span 1' }}>
                  <label>Intro</label>
                  <textarea rows="3" value={form.intro} onChange={e=>setForm(f=>({...f, intro: e.target.value}))} />
                </div>
                <div className="form-group full-width" style={{ gridColumn: '2 / span 1' }}>
                  <label>Certificates (JSON array or comma separated)</label>
                  <textarea rows="3" value={form.certificates} onChange={e=>setForm(f=>({...f, certificates: e.target.value}))} />
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
        title="Delete user profile?"
        message="This action cannot be undone."
        destructive
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default Personnel;