import React, { useState, useEffect, useMemo } from 'react';
import './Tabs.css';

// Supports both controlled and uncontrolled usage.
// - Uncontrolled: provide optional defaultTab
// - Controlled: provide activeTab and either onChange or setActiveTab (legacy)
function Tabs({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  setActiveTab: setActiveTabProp,
  variant = 'default',
  onChange,
}) {
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultTab || tabs[0]?.label
  );

  const isControlled = controlledActiveTab !== undefined && controlledActiveTab !== null;
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;

  useEffect(() => {
    if (!isControlled && defaultTab) {
      setInternalActiveTab(defaultTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab, isControlled]);

  // Ensure active tab always exists among provided tabs
  const activeContent = useMemo(() => {
    const active = tabs.find((tab) => tab.label === activeTab);
    return active ? active.content : tabs[0]?.content;
  }, [tabs, activeTab]);

  const handleTabChange = (tabLabel) => {
    if (!isControlled) {
      setInternalActiveTab(tabLabel);
    }
    if (typeof onChange === 'function') {
      onChange(tabLabel);
    }
    // Backward-compatible: support setActiveTab prop if provided
    if (typeof setActiveTabProp === 'function') {
      setActiveTabProp(tabLabel);
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
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>
      <div className="tabs-content">{activeContent}</div>
    </div>
  );
}

export default Tabs;