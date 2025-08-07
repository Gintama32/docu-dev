import React, { createContext, useState, useContext, useEffect } from 'react';

const ProposalContext = createContext(null);

export const useProposal = () => useContext(ProposalContext);

const STORAGE_KEY = 'sherpa-gcm-selected-proposal';

export const ProposalProvider = ({ children }) => {
  // Initialize from localStorage if available
  const [selectedProposal, setSelectedProposalState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load proposal from localStorage:', error);
      return null;
    }
  });

  // Wrapper function to update both state and localStorage
  const setSelectedProposal = (proposal) => {
    try {
      if (proposal) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(proposal));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setSelectedProposalState(proposal);
    } catch (error) {
      console.warn('Failed to save proposal to localStorage:', error);
      // Still update state even if localStorage fails
      setSelectedProposalState(proposal);
    }
  };

  // Clean up invalid data on mount
  useEffect(() => {
    if (selectedProposal && typeof selectedProposal !== 'object') {
      setSelectedProposal(null);
    }
  }, []);

  return (
    <ProposalContext.Provider value={{ selectedProposal, setSelectedProposal }}>
      {children}
    </ProposalContext.Provider>
  );
};
