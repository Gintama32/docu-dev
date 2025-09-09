import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    // Check if user is logged in on app start
    if (token) {
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  // Configure dedicated API client
  useEffect(() => {
    api.configure({
      getToken: () => token,
      onUnauthorized: () => logout(),
      // In production, set VITE_API_BASE to point to your backend origin.
      // In development, leave it unset to use the dev server proxy.
      baseUrl: import.meta.env?.VITE_API_BASE || ''
    });
  }, [token]);

  const checkAuthStatus = async () => {
    try {
      const response = await api.request('/api/auth/me');

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, clear it
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('access_token', data.access_token);
        
        // Return redirect path for post-login navigation
        const savedPath = redirectPath;
        setRedirectPath(null);
        
        return { success: true, redirectPath: savedPath };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('access_token', data.access_token);
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const microsoftSSO = async (accessToken, userInfo) => {
    try {
      const response = await api.request('/api/auth/microsoft-sso', {
        method: 'POST',
        body: JSON.stringify({
          access_token: accessToken,
          microsoft_id: userInfo.id,
          email: userInfo.mail || userInfo.userPrincipalName,
          full_name: userInfo.displayName,
          first_name: userInfo.givenName,
          last_name: userInfo.surname
        })
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('access_token', data.access_token);
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail || 'SSO login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async (saveCurrentPath = true) => {
    try {
      // Save current path for redirect after login
      if (saveCurrentPath && window.location.pathname !== '/') {
        setRedirectPath(window.location.pathname + window.location.search);
      }
      
      if (token) {
        await api.request('/api/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('access_token');
      // Clear persisted selections to avoid stale state across sessions
      localStorage.removeItem('sherpa-gcm-selected-proposal');
      localStorage.removeItem('sherpa-gcm-selected-resume');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.request('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail || 'Profile update failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  // Add authorization header to API calls and handle 401
  const apiCall = async (url, options = {}) => {
    return api.request(url, options);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    redirectPath,
    login,
    register,
    microsoftSSO,
    logout,
    updateProfile,
    apiCall
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
