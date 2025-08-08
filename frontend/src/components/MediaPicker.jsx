import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

function MediaPicker({ value, onChange }) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);

  const backendBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8001';
  const toAbsolute = (uri) => {
    if (!uri) return uri;
    if (uri.startsWith('http')) return uri;
    if (uri.startsWith('/static/')) return `${backendBase}${uri}`;
    return uri;
  };

  const reload = async () => {
    const { response, data } = await api.json('/api/media');
    if (response.ok) setItems(data || []);
  };

  useEffect(() => { reload(); }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.request('/api/media/upload', { method: 'POST', body: form });
      if (res.ok) {
        const media = await res.json();
        // refresh to keep list consistent
        await reload();
        if (onChange) onChange(media.id);
      } else {
        // noop; could surface error toast
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={value || ''} onChange={(e) => onChange && onChange(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Select existing…</option>
          {items.map((m) => (
            <option key={m.id} value={m.id}>{m.media_uri ? m.media_uri.split('/').pop() : `Media #${m.id}`}</option>
          ))}
        </select>
        <label className="button-secondary" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : 'Upload'}
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      </div>
      {value && (
        <div style={{ marginTop: 8 }}>
          {(() => {
            const selected = items.find((m) => m.id === value);
            if (!selected) return null;
            const src = selected.media_uri ? toAbsolute(selected.media_uri) : `${backendBase}/api/media/${selected.id}/raw`;
            return <img src={src} alt="Selected" style={{ maxWidth: 180, borderRadius: 6, border: '1px solid var(--border-light)' }} />;
          })()}
        </div>
      )}
    </div>
  );
}

export default MediaPicker;


