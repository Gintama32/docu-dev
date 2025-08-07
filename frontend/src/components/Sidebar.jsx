import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="company-name">SherpaGCM</h1>
        <h2 className="app-name">PropNexus</h2>
      </div>
      <nav>
        <ul>
          <li><Link to="/proposals">Proposals</Link></li>
        </ul>
        <h3>Tools</h3>
        <ul>
          <li><Link to="/resume">Resume Builder</Link></li>
          <li><Link to="/project-sheet">Project Sheet</Link></li>
        </ul>
        <h3>Data</h3>
        <ul>
          <li><Link to="/experience">Experience</Link></li>
          <li><Link to="/projects">Projects</Link></li>
          <li><Link to="/personnel">Personnel</Link></li>
        </ul>
      </nav>
      <div className="sidebar-footer">
        {/* User Profile Section */}
        <div className="user-profile-section">
          <div className="user-avatar">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || 'User'}</div>
            <div className="user-email">{user?.email}</div>
            {user?.department && (
              <div className="user-department">{user.department}</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sidebar-actions">
          <button 
            className="theme-toggle-sidebar" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

          <button 
            className="logout-button" 
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16,17 21,12 16,7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;