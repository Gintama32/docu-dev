import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';

const DataContext = createContext(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};

// Simple in-memory cache with TTL per resource
function createResource() {
  return { data: null, lastLoadedAt: 0 };
}

export const DataProvider = ({ children, defaultTTL = 30000 }) => {
  const clientsRef = useRef(createResource());
  const contactsRef = useRef(createResource());
  const experiencesRef = useRef(createResource());
  const proposalsRef = useRef(createResource());

  const [loading, setLoading] = useState({});
  const isFresh = (ts, ttl) => Date.now() - ts < (ttl ?? defaultTTL);

  const getCached = (ref, ttl) => (isFresh(ref.current.lastLoadedAt, ttl) ? ref.current.data : null);

  const loadWithCache = useCallback(async (ref, path, ttl) => {
    const cached = getCached(ref, ttl);
    if (cached) return cached;

    // Prevent N+ clicks from blasting network
    const key = path;
    if (loading[key]) return ref.current.data; // someone else is loading; return possibly stale data

    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const { response, data } = await api.json(path, { cacheTTL: ttl ?? defaultTTL });
      if (response.ok) {
        ref.current = { data: data || [], lastLoadedAt: Date.now() };
      }
      return ref.current.data;
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [loading, defaultTTL]);

  const refresh = useCallback(async (ref, path) => {
    const { response, data } = await api.json(path, { force: true });
    if (response.ok) {
      ref.current = { data: data || [], lastLoadedAt: Date.now() };
    }
    return ref.current.data;
  }, []);

  const value = {
    // getters (cached)
    getClients: (ttl) => loadWithCache(clientsRef, '/api/clients', ttl),
    getContacts: (ttl) => loadWithCache(contactsRef, '/api/contacts', ttl),
    getExperiences: (ttl) => loadWithCache(experiencesRef, '/api/experiences', ttl),
    getProposals: (ttl) => loadWithCache(proposalsRef, '/api/proposals', ttl ?? 15000),

    // refreshers (force reload)
    refreshClients: () => refresh(clientsRef, '/api/clients'),
    refreshContacts: () => refresh(contactsRef, '/api/contacts'),
    refreshExperiences: () => refresh(experiencesRef, '/api/experiences'),
    refreshProposals: () => refresh(proposalsRef, '/api/proposals'),

    // access raw cached data synchronously (may be null)
    clients: clientsRef.current.data,
    contacts: contactsRef.current.data,
    experiences: experiencesRef.current.data,
    proposals: proposalsRef.current.data,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
