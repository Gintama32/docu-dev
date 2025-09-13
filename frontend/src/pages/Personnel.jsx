import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import '../App.css';
import './Proposals.css';
import '../components/UnifiedTable.css';

function Personnel() {
  const navigate = useNavigate();
  const toast = useToast();
  const { getProfiles, refreshProfiles } = useData();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchList();
    }
  }, []);

  // Refresh profiles when component regains focus (after editing)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        await refreshProfiles(); // Clear cache first
        fetchList();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [q]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getProfiles(); // Get all profiles, filter client-side
      setItems(data || []);
    } finally { setLoading(false); }
  };

  // Client-side filtering for better UX
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    if (!q.trim()) return items;
    
    const searchTerm = q.toLowerCase();
    return items.filter(item => 
      item.full_name?.toLowerCase().includes(searchTerm) ||
      item.first_name?.toLowerCase().includes(searchTerm) ||
      item.last_name?.toLowerCase().includes(searchTerm) ||
      item.current_title?.toLowerCase().includes(searchTerm) ||
      item.department?.toLowerCase().includes(searchTerm) ||
      item.email?.toLowerCase().includes(searchTerm)
    );
  }, [items, q]);

  const onDelete = async (item) => {
    setConfirmDeleteId(item.id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    
    try {
      const response = await api.request(`/api/user-profiles/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await refreshProfiles(); // Clear cache
        fetchList();
        toast.success('Profile deleted');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(`Failed to delete profile: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error(`Failed to delete profile: ${error.message}`);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="proposals-page">
      <div className="proposals-header">
        <h1>User Profiles</h1>
        <div className="header-actions">
          <button 
            className="button-primary" 
            onClick={() => navigate('/personnel/profile/new')}
          >
            Create Profile
          </button>
        </div>
      </div>

      <div className="proposals-filters">
        <div className="filter-group" style={{ minWidth: 240 }}>
          <label>Search</label>
          <input 
            className="search-field" 
            type="search" 
            placeholder="Search profiles..." 
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

      {/* Results count */}
      <div className="results-info" style={{ padding: '0 var(--space-lg)', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
        Showing {filteredItems.length} of {items.length} profiles
      </div>

      <div className="unified-table-container">
        <div className="unified-grid-table">
          <div className="unified-grid-header personnel-grid">
            <div>Image</div>
            <div>Name</div>
            <div>Actions</div>
          </div>
          {filteredItems.map((item) => (
            <div key={item.id} className="unified-grid-row personnel-grid">
              <div>
                {item.main_image_id ? (
                  <img
                    src={`${import.meta?.env?.VITE_API_BASE || 'http://localhost:8001'}/api/media/${item.main_image_id}/raw`}
                    alt="Profile"
                    style={{ width: 100, height: 68, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-light)' }}
                  />
                ) : (
                  <div style={{ width: 100, height: 68, background: 'var(--background-secondary)', border: '1px solid var(--border-light)', borderRadius: 6 }} />
                )}
              </div>
              <div className="table-secondary-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || '-'}
              </div>
              <div className="table-actions">
                <button 
                  className="table-action-edit" 
                  onClick={() => navigate(`/personnel/profile/${item.id}`)}
                  title="Edit Profile"
                >
                  Edit
                </button>
                <button className="table-action-delete" onClick={() => onDelete(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

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