import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useToast } from './Toast';

function ResumeEditorTab({
  editingResume,
  editedResumeContent,
  setEditedResumeContent,
  handleSaveResumeChanges,
  handleUpdateResume,
  selectedExperiences,
  onClose,
  onResumeUpdated,
}) {
  const toast = useToast();
  const iframeRef = useRef(null);
  const [showEditor, setShowEditor] = useState(false); // Default to preview mode
  const [templates, setTemplates] = useState([]);

  // The iframe content is now handled via srcDoc prop, no manual updates needed

  // Load templates for the template select
  useEffect(() => {
    (async () => {
      try {
        const [{ response: listRes, data: list }, { response: defRes, data: def }] = await Promise.all([
          api.json('/api/templates'),
          api.json('/api/templates/default')
        ]);
        let temps = [];
        if (listRes.ok) temps = list || [];
        if (defRes?.ok && def) {
          if (!temps.find(t => t.id === def.id)) temps.unshift(def);
        }
        setTemplates(temps);
      } catch (_) {}
    })();
  }, []);

  // Helper to refresh the current resume after backend mutations so
  // other tabs immediately reflect the latest state
  const refreshResume = async () => {
    try {
      const res = await api.request(`/api/resumes/${editingResume.id}`);
      if (res.ok) {
        const updated = await res.json();
        if (typeof onResumeUpdated === 'function') onResumeUpdated(updated);
      }
    } catch (_) {}
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.request(`/api/resumes/${editingResume.id}/pdf`);

      if (response.status === 503) {
        const errorData = await response.json();
        toast.error('PDF generation is not available. Using print as fallback.');
        // Offer to print instead
        handlePrintResume();
        return;
      }

      if (!response.ok) throw new Error('PDF download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${editingResume.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF download started.');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Use the Print option to save as PDF.');
    }
  };

  const handlePrintResume = () => {
    const iframe = document.getElementById('resume-preview-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="resume-editor-container">
      <div className="resume-editor-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label htmlFor="template-select" style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
            Template:
          </label>
          <select
            id="template-select"
            value={editingResume?.template_id || ''}
            onChange={async (e) => {
              const tplId = e.target.value ? Number(e.target.value) : null;
              try {
                const res = await api.request(`/api/resumes/${editingResume.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({ template_id: tplId })
                });
                if (!res.ok) return;
                await refreshResume();
                // Regenerate to apply template immediately
                const regen = await api.request('/api/generate-final-resume', {
                  method: 'POST',
                  body: JSON.stringify({ resume_id: editingResume.id })
                });
                if (regen.ok) {
                  const regenData = await regen.json();
                  if (regenData.success && regenData.generated_content) {
                    setEditedResumeContent(regenData.generated_content);
                    toast.success('Template switched and resume regenerated!');
                  } else {
                    toast.error('Template regeneration failed: ' + (regenData.message || 'Unknown error'));
                  }
                } else {
                  toast.error('Failed to regenerate with new template');
                }
              } catch(err) {
                console.error('Error switching template:', err);
                toast.error('Failed to switch template: ' + err.message);
              }
            }}
            title="Switch template"
          >
            <option value="">Select Template</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button 
            type="button" 
            className="button-primary button-with-icon"
            onClick={handleUpdateResume}
            title="Regenerate resume content with current experiences and personalizations"
          >
            <RefreshIcon style={{ fontSize: '20px' }} />
            Regenerate
          </button>
        </div>
        <div className="resume-editor-actions" style={{display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center'}}>
          <button 
            type="button" 
            className="button-primary"
            onClick={handleDownloadPDF}
            title="Download resume as PDF"
          >
            <PictureAsPdfIcon style={{ fontSize: '16px', marginRight: '6px' }} />
            Download PDF
          </button>
          {/* Hidden for now - advanced users only */}
          {/* 
          <button 
            type="button" 
            className={`button-toggle ${!showEditor ? 'active' : ''}`}
            onClick={() => setShowEditor(false)}
          >
            Preview
          </button>
          <button 
            type="button" 
            className={`button-toggle ${showEditor ? 'active' : ''}`}
            onClick={() => setShowEditor(true)}
          >
            Edit HTML
          </button>
          */}
        </div>
      </div>

      {/* Always show preview since editor buttons are hidden */}
      {true ? (
        <div className="resume-preview-container">
          <iframe
            ref={iframeRef}
            className="resume-preview-iframe"
            title="Resume Preview"
            sandbox="allow-same-origin"
            srcDoc={editedResumeContent || '<html><body><p>Loading resume...</p></body></html>'}
            style={{
              width: '100%',
              height: '600px',
              border: '1px solid var(--border-light)',
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
          />
        </div>
      ) : null /* HTML Editor hidden for regular users */}
    </div>
  );
}

export default ResumeEditorTab;