import React, { useState } from 'react';

function SkillsSection({ profile, onUpdate, onSave: _onSave }) {
  const [skills, setSkills] = useState(profile?.skills || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    level: 'Intermediate',
    years: '',
    category: ''
  });

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  const commonCategories = [
    'Programming Languages',
    'Frontend Technologies',
    'Backend Technologies',
    'Databases',
    'Cloud Platforms',
    'DevOps & Tools',
    'Frameworks & Libraries',
    'Design & UX',
    'Project Management',
    'Soft Skills'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      level: 'Intermediate',
      years: '',
      category: ''
    });
    setEditingIndex(null);
    setShowAddForm(false);
  };

  const handleAddSkill = () => {
    if (!formData.name.trim()) return;
    
    const newSkill = {
      name: formData.name.trim(),
      level: formData.level,
      years: formData.years ? parseInt(formData.years) : null,
      category: formData.category.trim() || null
    };

    let updatedSkills;
    if (editingIndex !== null) {
      updatedSkills = [...skills];
      updatedSkills[editingIndex] = newSkill;
    } else {
      updatedSkills = [...skills, newSkill];
    }

    setSkills(updatedSkills);
    onUpdate({ skills: updatedSkills });
    resetForm();
  };

  const handleEditSkill = (index) => {
    const skill = skills[index];
    setFormData({
      name: skill.name,
      level: skill.level,
      years: skill.years?.toString() || '',
      category: skill.category || ''
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDeleteSkill = (index) => {
    const updatedSkills = skills.filter((_, i) => i !== index);
    setSkills(updatedSkills);
    onUpdate({ skills: updatedSkills });
  };

  const groupedSkills = skills.reduce((acc, skill, index) => {
    const category = skill.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...skill, index });
    return acc;
  }, {});

  return (
    <div className="section-content">
      <div className="section-actions">
        <button 
          className="button-primary"
          onClick={() => setShowAddForm(true)}
        >
          Add Skill
        </button>
      </div>
      {/* Add/Edit Form */}
      {showAddForm && (
      <div className="add-form">
        <h4>{editingIndex !== null ? 'Edit Skill' : 'Add New Skill'}</h4>
        <div className="form-grid">
          <div className="form-row">
            <div className="form-group">
              <label>Skill Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Python, React, Project Management..."
                required
              />
            </div>
            <div className="form-group">
              <label>Proficiency Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({...formData, level: e.target.value})}
              >
                {skillLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                    ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.years}
                onChange={(e) => setFormData({...formData, years: e.target.value})}
                placeholder="3"
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                list="categories"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="Programming Languages"
              />
              <datalist id="categories">
                {commonCategories.map(cat => (
                  <option key={cat} value={cat} />
                    ))}
              </datalist>
            </div>
          </div>
          <div className="form-actions">
            <button 
              className="button-secondary"
              onClick={resetForm}
            >
              Cancel
            </button>
            <button 
              className="button-primary"
              onClick={handleAddSkill}
              disabled={!formData.name.trim()}
            >
              {editingIndex !== null ? 'Update' : 'Add'} Skill
            </button>
          </div>
        </div>
      </div>
        )}

      {/* Skills Display */}
      <div className="skills-container">
        {Object.keys(groupedSkills).length === 0 ? (
          <div className="empty-state">
            <p>No skills added yet. Click "Add Skill" to get started.</p>
          </div>
          ) : (
            Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div key={category} className="skill-category">
                <h4 className="category-title">{category}</h4>
                <div className="skills-grid">
                  {categorySkills.map((skill) => (
                    <div key={skill.index} className="skill-card">
                      <div className="skill-header">
                        <h5 className="skill-name">{skill.name}</h5>
                        <div className="skill-actions">
                          <button 
                            className="skill-action-btn"
                            onClick={() => handleEditSkill(skill.index)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            className="skill-action-btn"
                            onClick={() => handleDeleteSkill(skill.index)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="skill-details">
                        <div className="skill-level">
                          <span className={`level-badge level-${skill.level.toLowerCase()}`}>
                            {skill.level}
                          </span>
                        </div>
                        {skill.years && (
                          <div className="skill-years">
                            {skill.years} {skill.years === 1 ? 'year' : 'years'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
      </div>
    </div>
  );
}

export default SkillsSection;

