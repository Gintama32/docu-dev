import React, { createContext, useState, useContext, useEffect } from 'react';

const ResumeContext = createContext(null);

export const useResume = () => useContext(ResumeContext);

const STORAGE_KEY = 'sherpa-gcm-selected-resume';

export const ResumeProvider = ({ children }) => {
  // Initialize from localStorage if available
  const [selectedResume, setSelectedResumeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load resume from localStorage:', error);
      return null;
    }
  });

  // Wrapper function to update both state and localStorage
  const setSelectedResume = (resume) => {
    try {
      if (resume) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setSelectedResumeState(resume);
    } catch (error) {
      console.warn('Failed to save resume to localStorage:', error);
      // Still update state even if localStorage fails
      setSelectedResumeState(resume);
    }
  };

  // Clean up invalid data on mount
  useEffect(() => {
    if (selectedResume && (typeof selectedResume !== 'object' || !selectedResume.id)) {
      console.warn('Invalid resume object in context, clearing:', selectedResume);
      setSelectedResumeState(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedResume]);

  return (
    <ResumeContext.Provider value={{ selectedResume, setSelectedResume }}>
      {children}
    </ResumeContext.Provider>
  );
};
