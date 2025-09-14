import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: window.location.origin,
  }
};

// Create MSAL instance and initialize it immediately
const msalInstance = new PublicClientApplication(msalConfig);
// Initialize immediately with an IIFE
(async () => {
  try {
    await msalInstance.initialize();
    console.error("MSAL initialized successfully");
  } catch (error) {
    console.error("MSAL initialization failed:", error);
  }
})();

const msalLoginRequest = {
  scopes: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read"
  ]
};
function Login({ showRedirectMessage = false }) {
  const { login, register, microsoftSSO, isAuthenticated, loading, redirectPath } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [msalInitialized, setMsalInitialized] = useState(false);
  
  // Check if MSAL is initialized when component mounts
  useEffect(() => {
    const checkMsalInitialization = async () => {
      try {
        if (!msalInstance.getConfiguration()) {
          await msalInstance.initialize();
        }
        setMsalInitialized(true);
      } catch (error) {
        console.error("Failed to initialize MSAL in component:", error);
      }
    };
    
    checkMsalInitialization();
  }, []);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    first_name: '',
    last_name: '',
    department: '',
    job_title: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    const targetPath = redirectPath || "/";
    return <Navigate to={targetPath} replace />;
  }

  if (loading) {
    return <div className="auth-loading">Loading...</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData);
      }

      if (result.success) {
        // Navigate to saved path or default
        const targetPath = result.redirectPath || "/";
        navigate(targetPath, { replace: true });
      } else {
        setError(result.error);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMicrosoftSSO = async () => {
    setError('');
    setIsSubmitting(true);
    
    // Ensure MSAL is initialized before proceeding
    if (!msalInitialized) {
      try {
        await msalInstance.initialize();
        setMsalInitialized(true);
      } catch (error) {
        console.error("Failed to initialize MSAL:", error);
        setError("Failed to initialize Microsoft authentication. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

  try {
    // Login popup
    const loginResponse = await msalInstance.loginPopup(msalLoginRequest);
    
    // Log the account object to see what's available
    console.error("Microsoft account object:", loginResponse.account);
    
    // Acquire access token for your backend API
    let tokenResponse;
    try {
      // Try silent token acquisition first
      tokenResponse = await msalInstance.acquireTokenSilent({
        ...msalLoginRequest,
        account: loginResponse.account
      });
    } catch {
      // If silent acquisition fails, try popup
      console.error("Silent token acquisition failed, acquiring token using popup");
      tokenResponse = await msalInstance.acquireTokenPopup({
        ...msalLoginRequest,
        account: loginResponse.account
      });
    }
    const accessToken = tokenResponse.accessToken;

    // Extract user info from the account and token claims
    const idTokenClaims = loginResponse.account.idTokenClaims;
    const account = loginResponse.account;
    
    // Extract the microsoft_id from the account
    const microsoftId = account.localAccountId || account.homeAccountId.split('.')[0];
    
    // Extract name fields - only full_name is required
    const fullName = account.name || idTokenClaims.name;
    
    // We're not sending first_name and last_name at all - keeping it simple and consistent
    // This matches exactly what we get from Microsoft
    
    // Extract email
    const email = account.username || idTokenClaims.preferred_username || idTokenClaims.upn;
    
    // Ensure all required fields are present and valid
    if (!microsoftId) {
      setError("Could not extract Microsoft ID from account");
      setIsSubmitting(false);
      return;
    }
    
    if (!email) {
      setError("Could not extract email from account");
      setIsSubmitting(false);
      return;
    }
    
    if (!fullName) {
      setError("Could not extract full name from account");
      setIsSubmitting(false);
      return;
    }
    
    // Log what we're sending to the backend
    console.error("Sending to backend via AuthContext:", {
      access_token: accessToken,
      microsoft_id: microsoftId,
      email: email,
      full_name: fullName
    });
    
    // Use the AuthContext microsoftSSO function to handle the API call
    // This avoids making duplicate calls to the backend
    const result = await microsoftSSO(accessToken, loginResponse.account);
    
    if (result.success) {
      // Navigate to saved path or default
      const targetPath = redirectPath || "/";
      navigate(targetPath, { replace: true });
    } else {
      setError(result.error || "Microsoft login failed");
    }

  } catch (err) {
    console.error("Microsoft SSO error:", err);
    if (err.errorCode === "user_cancelled") {
      setError("Login was cancelled by the user");
    } else if (err.errorCode === "consent_required") {
      setError("Consent is required. Please try again and accept the permissions");
    } else {
      setError(`Microsoft SSO login failed: ${err.message || err}`);
    }
  } finally {
    setIsSubmitting(false);
  }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      email: '',
      password: '',
      full_name: '',
      first_name: '',
      last_name: '',
      department: '',
      job_title: ''
    });
  };

  return (
    <div className="auth-container">
      {showRedirectMessage && (
        <div className="redirect-message">
          <p>Your session expired. Please log in again to continue where you left off.</p>
        </div>
      )}
      <div className="auth-card">
        <div className="auth-header">
          <h1>SherpaGCM</h1>
          <h2>PropNexus</h2>
          <p>{isLogin ? 'Sign in to your account' : 'Create your account'}</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    placeholder="Your department"
                  />
                </div>
                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                    placeholder="Your job title"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter your password"
              minLength="6"
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          onClick={handleMicrosoftSSO}
          className="microsoft-sso-btn"
          disabled={isSubmitting}
        >
          <svg width="20" height="20" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="12" y="1" width="9" height="9" fill="#00a4ef"/>
            <rect x="1" y="12" width="9" height="9" fill="#ffb900"/>
            <rect x="12" y="12" width="9" height="9" fill="#7fba00"/>
          </svg>
          Continue with Microsoft
        </button>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={toggleMode}
              className="auth-toggle-btn"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
