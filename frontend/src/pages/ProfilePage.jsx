import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import Tabs from '../components/Tabs';
import BasicContactSection from '../components/profile/BasicContactSection';
import SkillsSection from '../components/profile/SkillsSection';
import CertificationsSection from '../components/profile/CertificationsSection';
import EducationSection from '../components/profile/EducationSection';
import ExperiencesSection from '../components/profile/ExperiencesSection';
import '../components/UnifiedTable.css';

function ProfilePage() {
  const { user } = useAuth();
  const { profileId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Personal');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profileId) {
      loadProfile();
    } else {
      // Create new profile mode
      setProfile({
        user_id: user?.id,
        first_name: '',
        last_name: '',
        full_name: '',
        current_title: '',
        department: '',
        employee_type: 'full-time',
        is_current_employee: true,
        professional_intro: '',
        email: '',
        mobile: '',
        address: '',
        about_url: '',
        skills: [],
        certifications: [],
        education: [],
        experiences: []
      });
      setLoading(false);
    }
  }, [profileId, user?.id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { response, data } = await api.json(`/api/user-profiles/${profileId}/full`);
      if (response.ok) {
        setProfile(data);
      } else {
        toast.error('Failed to load profile');
        navigate('/personnel');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error('Failed to load profile');
      navigate('/personnel');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (profileData) => {
    try {
      const url = profileId ? `/api/user-profiles/${profileId}` : '/api/user-profiles';
      const method = profileId ? 'PUT' : 'POST';
      
      // If profileData is partial (from section save), merge with current profile
      const mergedData = profileData && Object.keys(profileData).length < 10 
        ? { ...profile, ...profileData }
        : profileData;
      
      // Filter data to only include fields that are valid for the backend schema
      const validFields = [
        'first_name', 'last_name', 'full_name', 'current_title', 'professional_intro',
        'department', 'employee_type', 'is_current_employee',
        'email', 'mobile', 'address', 'about_url',
        'certifications', 'skills', 'education', 'main_image_id'
      ];
      
      const dataToSave = {};
      validFields.forEach(field => {
        if (mergedData && mergedData[field] !== undefined) {
          let value = mergedData[field];
          
          // Sanitize data based on field type
          if (field === 'about_url' && value === '') {
            // Empty string is not valid for HttpUrl, send null instead
            value = null;
          } else if (field === 'email' && value === '') {
            // Empty string is not valid for EmailStr, send null instead
            value = null;
          } else if (['certifications', 'skills', 'education'].includes(field)) {
            // Only send collections if they have valid data
            if (Array.isArray(value) && value.length === 0) {
              value = null; // Send null instead of empty array
            } else if (Array.isArray(value)) {
              // Convert date objects to ISO strings for JSON serialization
              value = value.map(item => {
                if (typeof item === 'object' && item !== null) {
                  const cleanItem = { ...item };
                  // Convert any date fields to ISO strings
                  Object.keys(cleanItem).forEach(key => {
                    if (cleanItem[key] instanceof Date) {
                      cleanItem[key] = cleanItem[key].toISOString().split('T')[0]; // YYYY-MM-DD format
                    }
                  });
                  return cleanItem;
                }
                return item;
              });
            }
          }
          
          dataToSave[field] = value;
        }
      });
      
      // For create operations, include user_id
      if (!profileId && mergedData?.user_id) {
        dataToSave.user_id = mergedData.user_id;
      }
      
      const { response, data } = await api.json(url, {
        method,
        body: JSON.stringify(dataToSave)
      });
      
      if (response.ok) {
        setProfile(data);
        setHasChanges(false);
        toast.success(profileId ? 'Profile updated successfully!' : 'Profile created successfully!');
        
        // If creating new profile, redirect to edit mode
        if (!profileId && data.id) {
          navigate(`/personnel/profile/${data.id}`, { replace: true });
        }
        
        return data;
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile');
      throw err;
    }
  };

  const updateProfile = (updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const getCompletionPercentage = () => {
    if (!profile) return 0;
    
    const fields = [
      profile.first_name,
      profile.last_name,
      profile.current_title,
      profile.professional_intro,
      profile.email,
      profile.mobile
    ];
    
    const collections = [
      profile.skills?.length > 0,
      profile.certifications?.length > 0,
      profile.education?.length > 0,
      profile.experiences?.length > 0
    ];
    
    const filledFields = fields.filter(Boolean).length;
    const filledCollections = collections.filter(Boolean).length;
    
    return Math.round(((filledFields + filledCollections) / (fields.length + collections.length)) * 100);
  };

  // Reorganized tabs for better UX flow - defined after functions to avoid hoisting issues
  const tabs = [
    { 
      label: 'Personal', 
      icon: '👤',
      content: (
        <BasicContactSection 
          profile={profile}
          onUpdate={updateProfile}
          onSave={saveProfile}
        />
      )
    },
    { 
      label: 'Experience', 
      icon: '💼',
      content: (
        <ExperiencesSection 
          profile={profile}
          onUpdate={updateProfile}
          onSave={saveProfile}
          profileId={profileId}
        />
      )
    },
    { 
      label: 'Skills', 
      icon: '🛠️',
      content: (
        <SkillsSection 
          profile={profile}
          onUpdate={updateProfile}
          onSave={saveProfile}
        />
      )
    },
    { 
      label: 'Education', 
      icon: '🎓',
      content: (
        <EducationSection 
          profile={profile}
          onUpdate={updateProfile}
          onSave={saveProfile}
        />
      )
    },
    { 
      label: 'Certifications', 
      icon: '🏆',
      content: (
        <CertificationsSection 
          profile={profile}
          onUpdate={updateProfile}
          onSave={saveProfile}
        />
      )
    }
  ];

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div>Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Clean Header */}
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>{profileId ? 'Edit Profile' : 'Create Profile'}</h1>
            <p>{profile?.full_name || profile?.first_name ? `${profile.full_name || profile.first_name + ' ' + (profile.last_name || '')}`.trim() : 'Professional Profile'}</p>
          </div>
          <div className="header-actions">
            <button 
              className="button-secondary" 
              onClick={() => navigate('/personnel')}
            >
              ← Back
            </button>
            {getCompletionPercentage() > 0 && (
              <div className="completion-badge">
                {getCompletionPercentage()}% Complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs using consistent component */}
      <Tabs 
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        variant="pills"
      />

      {/* Save Changes Bar */}
      {hasChanges && (
        <div className="save-changes-bar">
          <div className="save-changes-content">
            <span>You have unsaved changes</span>
            <div className="save-changes-actions">
              <button 
                className="button-secondary"
                onClick={() => {
                  setHasChanges(false);
                  if (profileId) {
                    loadProfile();
                  }
                }}
              >
                Discard
              </button>
              <button 
                className="button-primary"
                onClick={() => saveProfile(profile)}
              >
                Save All Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;

