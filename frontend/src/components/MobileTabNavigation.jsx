import React from 'react';
import './MobileTabNavigation.css';

function MobileTabNavigation({ tabs, activeTab, onTabChange, resumeName }) {
  const currentTabIndex = tabs.findIndex(tab => tab.label === activeTab);
  const currentTab = tabs[currentTabIndex];

  const goToPrevious = () => {
    if (currentTabIndex > 0) {
      onTabChange(tabs[currentTabIndex - 1].label);
    }
  };

  const goToNext = () => {
    if (currentTabIndex < tabs.length - 1) {
      onTabChange(tabs[currentTabIndex + 1].label);
    }
  };

  return (
    <div className="mobile-tab-navigation">
      {/* Progress indicator */}
      <div className="tab-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentTabIndex + 1) / tabs.length) * 100}%` }}
          />
        </div>
        <span className="progress-text">
          Step {currentTabIndex + 1} of {tabs.length}
        </span>
      </div>

      {/* Tab title and navigation */}
      <div className="tab-header-mobile">
        <div className="tab-title-section">
          <h2 className="current-tab-title">{currentTab?.label}</h2>
          <p className="resume-name-mobile">{resumeName}</p>
        </div>
        
        {/* Navigation buttons */}
        <div className="tab-nav-buttons">
          <button 
            className="tab-nav-btn prev-btn"
            onClick={goToPrevious}
            disabled={currentTabIndex === 0}
            title="Previous step"
          >
            <span className="nav-icon">←</span>
          </button>
          
          <div className="tab-dots">
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                className={`tab-dot ${index === currentTabIndex ? 'active' : ''} ${index < currentTabIndex ? 'completed' : ''}`}
                onClick={() => onTabChange(tab.label)}
                title={tab.label}
              />
            ))}
          </div>
          
          <button 
            className="tab-nav-btn next-btn"
            onClick={goToNext}
            disabled={currentTabIndex === tabs.length - 1}
            title="Next step"
          >
            <span className="nav-icon">→</span>
          </button>
        </div>
      </div>

      {/* Horizontal scrollable tabs (fallback) */}
      <div className="mobile-tabs-scroll">
        <div className="mobile-tabs-container">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              className={`mobile-tab-btn ${activeTab === tab.label ? 'active' : ''}`}
              onClick={() => onTabChange(tab.label)}
            >
              <span className="tab-number">{index + 1}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MobileTabNavigation;