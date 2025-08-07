import React, { useState, useEffect } from 'react';
import './Tabs.css';

function Tabs({ tabs, defaultTab, variant = 'default', onChange }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.label);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabChange = (tabLabel) => {
    setActiveTab(tabLabel);
    if (onChange) {
      onChange(tabLabel);
    }
  };

  return (
    <div className="tabs-container">
      <div className={`tabs-header ${variant === 'pills' ? 'pills' : ''}`}>
        {tabs.map((tab) => (
          <button
            key={tab.label}
            className={`tab-button ${activeTab === tab.label ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.label)}
            disabled={tab.disabled}
          >
            {tab.icon && (
              <span className="tab-button-icon">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
            )}
            {!tab.icon && tab.label}
            {tab.badge && (
              <span className="tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabs.find((tab) => tab.label === activeTab)?.content}
      </div>
    </div>
  );
}

export default Tabs;