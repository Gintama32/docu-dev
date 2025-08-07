import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';

function ResumeEditorTab({
  editingResume,
  editedResumeContent,
  setEditedResumeContent,
  handleSaveResumeChanges,
  handleUpdateResume,
  selectedExperiences,
  onClose,
}) {
  const iframeRef = useRef(null);
  const [showEditor, setShowEditor] = useState(false);

  // Function to write content to iframe
  const updateIframeContent = () => {
    if (iframeRef.current && editedResumeContent) {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(editedResumeContent);
      iframeDoc.close();
    }
  };

  // Update iframe when content changes or when switching to preview mode
  useEffect(() => {
    if (!showEditor) {
      // Small delay to ensure iframe is mounted
      setTimeout(updateIframeContent, 0);
    }
  }, [editedResumeContent, showEditor]);

  const handleDownloadPDF = async () => {
    try {
      const response = await api.request(`/api/resumes/${editingResume.id}/pdf`);
      
      if (response.status === 503) {
        const errorData = await response.json();
        alert(`PDF generation is not available.\n\n${errorData.message}\n\nAlternative: ${errorData.instructions.alternative}`);
        
        // Offer to print instead
        if (window.confirm('Would you like to print the resume instead? You can save it as PDF from the print dialog.')) {
          handlePrintResume();
        }
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
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. You can use the Print option (Ctrl+P or Cmd+P) to save as PDF instead.');
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
        <div>
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
        <div className="resume-editor-actions">
          <button 
            type="button" 
            className="button-download-pdf-icon"
            onClick={handleDownloadPDF}
            title="Download as PDF"
          >
            <PictureAsPdfIcon />
          </button>
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
        </div>
      </div>

      {!showEditor ? (
        <div className="resume-preview-container">
          <iframe
            ref={iframeRef}
            className="resume-preview-iframe"
            title="Resume Preview"
            sandbox="allow-same-origin"
            style={{
              width: '100%',
              height: '600px',
              border: '1px solid var(--border-light)',
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
          />
        </div>
      ) : (
        <form onSubmit={handleSaveResumeChanges} className="resume-edit-form">
          <div className="form-group">
            <label>
              Edit HTML Content:
              <textarea
                value={editedResumeContent}
                onChange={(e) => setEditedResumeContent(e.target.value)}
                rows="25"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="button-primary">Save</button>
            <button type="button" className="button-secondary" onClick={onClose}>Close</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ResumeEditorTab;