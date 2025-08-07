import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { api } from '../lib/api';
import { useData } from '../context/DataContext';
import './Proposals.css';

function Proposals() {
  const { getClients, getContacts, getProposals } = useData();
  const [proposals, setProposals] = useState([]);
  const [filteredProposals, setFilteredProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    search: '',
    dateRange: ''
  });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    context: '',
    source: 'manual',
    status: 'draft',
    location: '',
    scope: '',
    due_date: '',
    project_brief: '',
    internal_notes: '',
    client_id: '',
    contact_id: ''
  });

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: '#6c757d' },
    { value: 'sent', label: 'Sent', color: '#17a2b8' },
    { value: 'under_review', label: 'Under Review', color: '#ffc107' },
    { value: 'accepted', label: 'Accepted', color: '#28a745' },
    { value: 'rejected', label: 'Rejected', color: '#dc3545' },
    { value: 'on_hold', label: 'On Hold', color: '#fd7e14' }
  ];

  // Load data
  useEffect(() => {
    // Use cached loads to avoid duplicate network hits on tab switches
    (async () => {
      const [p, c, ct] = await Promise.all([
        getProposals(),
        getClients(),
        getContacts(),
      ]);
      if (Array.isArray(p)) setProposals(p);
      if (Array.isArray(c)) setClients(c);
      if (Array.isArray(ct)) setContacts(ct);
      setLoading(false);
    })();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [proposals, filters]);

  const loadProposals = async () => {
    try {
      const { response, data } = await api.json('/api/proposals', { cacheTTL: 30000 });
      if (response.ok) {
        setProposals(data || []);
      } else {
        throw new Error('Failed to load proposals');
      }
    } catch (err) {
      setError('Failed to load proposals: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { response, data } = await api.json('/api/clients', { cacheTTL: 30000 });
      if (response.ok) {
        setClients(data || []);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadContacts = async () => {
    try {
      const { response, data } = await api.json('/api/contacts', { cacheTTL: 30000 });
      if (response.ok) {
        setContacts(data || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...proposals];

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    // Client filter
    if (filters.client) {
      filtered = filtered.filter(p => p.client_id === parseInt(filters.client));
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.project_brief?.toLowerCase().includes(searchTerm) ||
        p.location?.toLowerCase().includes(searchTerm) ||
        p.client?.client_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Date range filter (last 30 days, 90 days, etc.)
    if (filters.dateRange) {
      const now = new Date();
      const daysAgo = parseInt(filters.dateRange);
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(p => new Date(p.created_at) >= cutoffDate);
    }

    setFilteredProposals(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      context: '',
      source: 'manual',
      status: 'draft',
      location: '',
      scope: '',
      due_date: '',
      project_brief: '',
      internal_notes: '',
      client_id: '',
      contact_id: ''
    });
  };

  const handleCreateProposal = () => {
    resetForm();
    setEditingProposal(null);
    setShowCreateModal(true);
  };

  const handleEditProposal = (proposal) => {
    setFormData({
      name: proposal.name || '',
      context: proposal.context || '',
      source: proposal.source || 'manual',
      status: proposal.status || 'draft',
      location: proposal.location || '',
      scope: proposal.scope || '',
      due_date: proposal.due_date || '',
      project_brief: proposal.project_brief || '',
      internal_notes: proposal.internal_notes || '',
      client_id: proposal.client_id || '',
      contact_id: proposal.contact_id || ''
    });
    setEditingProposal(proposal);
    setShowCreateModal(true);
  };

  const handleSaveProposal = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingProposal ? `/api/proposals/${editingProposal.id}` : '/api/proposals';
      const method = editingProposal ? 'PUT' : 'POST';
      
      // Format data for backend validation
      const submitData = {
        ...formData,
        // Convert empty strings to null for optional integer fields
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
        // Convert empty string to null for date field
        due_date: formData.due_date || null
      };
      
      const response = await api.request(url, {
        method,
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        await loadProposals();
        setShowCreateModal(false);
        resetForm();
        setEditingProposal(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save proposal');
      }
    } catch (err) {
      setError('Failed to save proposal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProposal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this proposal?')) return;

    try {
      const response = await api.request(`/api/proposals/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadProposals();
      } else {
        throw new Error('Failed to delete proposal');
      }
    } catch (err) {
      setError('Failed to delete proposal: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[0];
    return (
      <span 
        className="status-badge"
        style={{ 
          backgroundColor: statusConfig.color + '20', 
          color: statusConfig.color,
          border: `1px solid ${statusConfig.color}`
        }}
      >
        {statusConfig.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && proposals.length === 0) {
    return <div className="loading">Loading proposals...</div>;
  }

  return (
    <div className="proposals-page">
      <div className="proposals-header">
        <h1>Proposals</h1>
        <button className="button-primary" onClick={handleCreateProposal}>
          Create New Proposal
        </button>
      </div>

      {/* Filters */}
      <div className="proposals-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Client:</label>
          <select 
            value={filters.client} 
            onChange={(e) => setFilters({...filters, client: e.target.value})}
          >
            <option value="">All Clients</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.client_name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Search:</label>
          <input 
            type="text"
            placeholder="Search proposals..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>

        <div className="filter-group">
          <label>Date Range:</label>
          <select 
            value={filters.dateRange} 
            onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
          >
            <option value="">All Time</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        <button 
          className="button-secondary"
          onClick={() => setFilters({ status: '', client: '', search: '', dateRange: '' })}
        >
          Clear Filters
        </button>
      </div>

      {/* Proposals List */}
      <div className="proposals-list">
        {error && <div className="error-message">{error}</div>}
        
        <div className="proposals-table">
          <div className="table-header">
            <div>Name</div>
            <div>Status</div>
            <div>Client</div>
            <div>Location</div>
            <div>Due Date</div>
            <div>Created</div>
            <div>Actions</div>
          </div>

          {filteredProposals.map(proposal => (
            <div key={proposal.id} className="table-row">
              <div className="proposal-name">
                <strong>{proposal.name}</strong>
                {proposal.project_brief && (
                  <div className="proposal-brief">{proposal.project_brief}</div>
                )}
              </div>
              <div>{getStatusBadge(proposal.status)}</div>
              <div>{proposal.client?.client_name || '-'}</div>
              <div>{proposal.location || '-'}</div>
              <div>{formatDate(proposal.due_date)}</div>
              <div>{formatDate(proposal.created_at)}</div>
              <div className="actions">
                <button 
                  className="button-secondary-small"
                  onClick={() => handleEditProposal(proposal)}
                >
                  Edit
                </button>
                <button 
                  className="button-danger-small"
                  onClick={() => handleDeleteProposal(proposal.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProposals.length === 0 && !loading && (
          <div className="empty-state">
            <h3>No proposals found</h3>
            <p>Create your first proposal to get started.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} className="proposal-modal structured-modal">
          <div className="modal-header">
            <h2>{editingProposal ? 'Edit Proposal' : 'Create New Proposal'}</h2>
          </div>
          <form onSubmit={handleSaveProposal} className="proposal-form">
            <div className="modal-body">
              <div className="form-grid">
                {/* Basic Information Section */}
                <div className="form-section">
                  <h3>Basic Information</h3>
                </div>
                
                <div className="form-group">
                  <label>Proposal Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter proposal name..."
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Project Brief</label>
                  <textarea
                    rows="2"
                    value={formData.project_brief}
                    onChange={(e) => setFormData({...formData, project_brief: e.target.value})}
                    placeholder="Brief description of the project..."
                  />
                </div>

                {/* Contacts & Location Section */}
                <div className="form-section">
                  <h3>Contacts & Location</h3>
                </div>

                <div className="form-group">
                  <label>Client</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.client_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Primary Contact</label>
                  <select
                    value={formData.contact_id}
                    onChange={(e) => setFormData({...formData, contact_id: e.target.value})}
                  >
                    <option value="">Select Contact</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.contact_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Project Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="City, State or Address..."
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>

                {/* Project Details Section */}
                <div className="form-section">
                  <h3>Project Details</h3>
                </div>

                <div className="form-group full-width">
                  <label>Project Context</label>
                  <textarea
                    rows="4"
                    value={formData.context}
                    onChange={(e) => setFormData({...formData, context: e.target.value})}
                    placeholder="Detailed context for proposal, background information..."
                  />
                </div>

                <div className="form-group full-width">
                  <label>Project Scope</label>
                  <textarea
                    rows="4"
                    value={formData.scope}
                    onChange={(e) => setFormData({...formData, scope: e.target.value})}
                    placeholder="Detailed project scope, deliverables, timeline..."
                  />
                </div>

                {/* Internal Section */}
                <div className="form-section">
                  <h3>Internal Notes</h3>
                </div>

                <div className="form-group full-width">
                  <label>Team Coordination Notes</label>
                  <textarea
                    rows="3"
                    value={formData.internal_notes}
                    onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
                    placeholder="Internal team coordination, strategy notes, reminders..."
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="form-actions">
                <button type="submit" className="button-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingProposal ? 'Update Proposal' : 'Create Proposal')}
                </button>
                <button 
                  type="button" 
                  className="button-secondary" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Proposals;
