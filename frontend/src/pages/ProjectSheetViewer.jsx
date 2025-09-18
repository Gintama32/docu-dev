import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import '../App.css';
import './ProjectSheetViewer.css';

function ProjectSheetViewer() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [sheet, setSheet] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (sheetId) {
      loadSheet();
    }
  }, [sheetId]);

  const loadSheet = async () => {
    setLoading(true);
    try {
      // Load sheet with generated content (like resumes)
      const { response: sheetResponse, data: sheetData } = await api.json(`/api/project-sheets/${sheetId}`);
      if (!sheetResponse.ok) {
        toast.error('Project sheet not found');
        navigate('/project-sheet');
        return;
      }

      setSheet(sheetData);
      setHtmlContent(sheetData.generated_content || '');
    } catch (error) {
      toast.error('Failed to load project sheet');
      navigate('/project-sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.request(`/api/project-sheets/${sheetId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sheet.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF downloaded successfully');
      } else {
        toast.error('Failed to download PDF');
      }
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { response, data } = await api.json(`/api/project-sheets/${sheetId}/regenerate`, {
        method: 'PUT'
      });

      if (response.ok) {
        toast.success('Project sheet regenerated with current data');
        // Update the current view with new content
        setSheet(data);
        setHtmlContent(data.generated_content);
      } else {
        toast.error('Failed to regenerate sheet');
      }
    } catch (error) {
      toast.error('Failed to regenerate sheet');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${sheet.title}"? This action cannot be undone.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const { response } = await api.json(`/api/project-sheets/${sheetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Project sheet deleted successfully');
        // Navigate back to project sheets list
        navigate('/project-sheet');
      } else {
        toast.error('Failed to delete project sheet');
      }
    } catch (error) {
      toast.error('Failed to delete project sheet');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="loading-indicator">Loading project sheet...</div>;
  }

  if (!sheet) {
    return <div className="error-state">Project sheet not found</div>;
  }

  return (
    <div className="project-sheet-viewer">
      {/* Header with actions */}
      <div className="sheet-viewer-header">
        <div className="header-left">
          <button 
            className="button-tertiary back-button"
            onClick={() => navigate('/project-sheet')}
          >
            ← Back to Project Sheets
          </button>
          <h1>{sheet.title}</h1>
        </div>
        
        <div className="header-actions">
          <button 
            className="button-secondary"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button 
            className="button-secondary"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button 
            className="button-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Sheet content */}
      <div className="sheet-content-container">
        <div 
          className="sheet-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}

export default ProjectSheetViewer;