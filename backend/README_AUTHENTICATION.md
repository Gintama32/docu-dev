# Authentication System

## Overview

PropNexus now includes a comprehensive authentication system with support for:
- Email/password authentication
- Microsoft Entra (Azure AD) SSO integration
- JWT token-based sessions
- User profile management
- Team collaboration features (proposal notes)

## Features

### User Management
- User registration with email/password
- User profiles with department, job title, and preferences
- Admin user support
- User sessions with token management

### Authentication Methods
1. **Email/Password**: Traditional authentication with bcrypt password hashing
2. **Microsoft SSO**: Integration with Microsoft Entra (Azure AD)

### Security Features
- JWT tokens for API authentication
- Bcrypt password hashing
- Session management with expiration
- IP address and user agent tracking
- Secure token validation

## Environment Variables

Add these to your `.env` file:

```env
# JWT Secret (auto-generated if not provided)
SECRET_KEY=your-secret-key-here

# Microsoft Azure AD Configuration (optional)
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=common
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/microsoft-sso` - Login with Microsoft SSO
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update current user profile
- `GET /api/auth/users` - List users (admin only)

### Usage Examples

#### Register
```bash
curl -X POST /api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe",
    "department": "Engineering"
  }'
```

#### Login
```bash
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Authenticated Requests
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" /api/auth/me
```

## Database Schema

### Users Table
- Basic user information (email, name, department, etc.)
- Authentication data (hashed password, SSO provider)
- Profile data (avatar, preferences, job title)
- Admin flags and status

### User Sessions Table
- Session tokens for extended login periods
- IP address and user agent tracking
- Session expiration management

### Proposal Notes Table
- Team collaboration on proposals
- User attribution for all notes
- Internal vs client-visible notes
- Note types (comments, status changes, system notes)

## Frontend Integration

### Authentication Context
The frontend uses React Context for authentication state management:

```jsx
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  return <div>Welcome, {user.full_name}!</div>;
}
```

### Protected Routes
All application routes are automatically protected - users must authenticate before accessing any features.

### API Integration
The AuthContext provides an `apiCall` method that automatically includes authentication headers:

```jsx
const { apiCall } = useAuth();

const response = await apiCall('/api/proposals', {
  method: 'POST',
  body: JSON.stringify(proposalData)
});
```

## Team Collaboration Features

### Proposal Notes System
- Replace simple text `internal_notes` with structured team chat
- Each note has user attribution and timestamp
- Support for different note types (comments, status changes)
- Real-time collaboration ready (WebSocket support can be added)

### User Tracking
- Track who created each proposal (`created_by_id`)
- Audit trail for all user actions
- User profiles visible throughout the application

## Microsoft SSO Integration

### Setup Requirements
1. Register application in Azure Portal
2. Configure redirect URIs
3. Set up API permissions for Microsoft Graph
4. Add environment variables

### Frontend Integration (Future)
The backend is ready for Microsoft SSO. Frontend integration would use MSAL (Microsoft Authentication Library):

```jsx
// Future implementation with @azure/msal-browser
const msalInstance = new PublicClientApplication(msalConfig);
const response = await msalInstance.acquireTokenSilent(tokenRequest);
await microsoftSSO(response.accessToken, response.account);
```

## Next Steps

### Immediate
1. Install new Python dependencies: `pip install -r requirements.txt`
2. Run database migration: `alembic upgrade head`
3. Set up environment variables
4. Test authentication flow

### Future Enhancements
1. Microsoft MSAL integration in frontend
2. Real-time notifications for proposal notes
3. Role-based permissions system
4. Password reset functionality
5. Two-factor authentication
6. SSO with other providers (Google, Okta)

## Security Considerations

- JWT tokens expire after 24 hours (configurable)
- User sessions last 30 days but can be invalidated
- Passwords are hashed with bcrypt (12 rounds)
- All API endpoints require authentication
- Microsoft tokens are verified against Microsoft Graph API
- No sensitive data is stored in JWT tokens
