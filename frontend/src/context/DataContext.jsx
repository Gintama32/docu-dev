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
  const profilesRef = useRef(createResource());
  const profilesMyRef = useRef(createResource());
  const projectsRef = useRef(createResource());
  
  // Track in-flight requests to prevent duplicates
  const inFlightRequests = useRef({});

  const [loading, setLoading] = useState({});
  const isFresh = (ts, ttl) => Date.now() - ts < (ttl ?? defaultTTL);

  const getCached = (ref, ttl) => (isFresh(ref.current.lastLoadedAt, ttl) ? ref.current.data : null);

  const loadWithCache = useCallback(async (ref, path, ttl) => {
    const cached = getCached(ref, ttl);
    if (cached) return cached;

    // Check if there's already an in-flight request for this path
    if (inFlightRequests.current[path]) {
      return inFlightRequests.current[path];
    }

    // Prevent N+ clicks from blasting network
    const key = path;
    if (loading[key]) return ref.current.data; // someone else is loading; return possibly stale data

    setLoading(prev => ({ ...prev, [key]: true }));
    
    // Create and store the promise to prevent duplicate requests
    const requestPromise = api.json(path, { cacheTTL: ttl ?? defaultTTL })
      .then(({ response, data }) => {
        if (response.ok) {
          ref.current = { data: data || [], lastLoadedAt: Date.now() };
        }
        return ref.current.data;
      })
      .finally(() => {
        setLoading(prev => ({ ...prev, [key]: false }));
        delete inFlightRequests.current[path];
      });
    
    inFlightRequests.current[path] = requestPromise;
    return requestPromise;
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
    getProfiles: (queryOrOptions, ttl) => {
      // Handle both query string and options object
      let path = '/api/user-profiles';
      let ref = profilesRef;
      
      if (typeof queryOrOptions === 'string') {
        // Simple query string
        if (queryOrOptions) {
          path = `/api/user-profiles?q=${encodeURIComponent(queryOrOptions)}`;
        }
      } else if (queryOrOptions?.only_mine) {
        // Use separate cache for only_mine
        path = '/api/user-profiles?only_mine=true';
        ref = profilesMyRef;
      }
      
      return loadWithCache(ref, path, ttl);
    },
    getProjects: (query, ttl) => {
      const path = query ? `/api/projects?q=${encodeURIComponent(query)}` : '/api/projects';
      return loadWithCache(projectsRef, path, ttl);
    },

    // refreshers (force reload)
    refreshClients: () => refresh(clientsRef, '/api/clients'),
    refreshContacts: () => refresh(contactsRef, '/api/contacts'),
    refreshExperiences: () => refresh(experiencesRef, '/api/experiences'),
    refreshProposals: () => refresh(proposalsRef, '/api/proposals'),
    refreshProfiles: () => refresh(profilesRef, '/api/user-profiles'),
    refreshProjects: () => refresh(projectsRef, '/api/projects'),

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
