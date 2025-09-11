import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import '../App.css';
import './Welcome.css';

function Welcome() {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Generate Resume',
      description: 'Create professional resumes from your profile',
      icon: '📄',
      link: '/resumes',
      color: 'var(--accent-primary)'
    },
    {
      title: 'Manage Projects',
      description: 'View and organize your project portfolio',
      icon: '🚀',
      link: '/projects',
      color: 'var(--color-success)'
    },
    {
      title: 'Update Profile',
      description: 'Keep your professional information current',
      icon: '👤',
      link: '/personnel',
      color: 'var(--color-info)'
    },
    {
      title: 'Track Experience',
      description: 'Document your professional journey',
      icon: '📈',
      link: '/experience',
      color: 'var(--color-warning)'
    }
  ];

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        {/* Hero Section */}
        <div className="welcome-hero">
          <div className="welcome-content">
            <h1 className="welcome-title">
              Hello, {user?.full_name || user?.first_name || 'there'}! 👋
            </h1>
            <h2 className="welcome-subtitle">
              Welcome to SherpaGCM PropNexus
            </h2>
            <p className="welcome-message">
              What do you have in mind today? Use the sidebar to navigate to the tools you need,
              or get started with one of the quick actions below.
            </p>
          </div>
          
          {/* Optional: Add a subtle background graphic or illustration */}
          <div className="welcome-graphic">
            <svg viewBox="0 0 200 200" className="welcome-illustration">
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.1"/>
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="80" fill="url(#gradient1)" />
              <circle cx="100" cy="100" r="60" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeOpacity="0.3" />
              <circle cx="100" cy="100" r="40" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeOpacity="0.2" />
            </svg>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="quick-actions">
          <h3 className="quick-actions-title">Quick Actions</h3>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <NavLink 
                key={index}
                to={action.link} 
                className="quick-action-card"
                style={{ '--accent-color': action.color }}
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-content">
                  <h4 className="action-title">{action.title}</h4>
                  <p className="action-description">{action.description}</p>
                </div>
                <div className="action-arrow">→</div>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Recent Activity or Stats (for future) */}
        <div className="welcome-footer">
          <div className="stats-preview">
            <div className="stat-item">
              <span className="stat-icon">📋</span>
              <span className="stat-text">Your professional toolkit awaits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Welcome;