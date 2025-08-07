# DocuMaker - Proposal & Resume Builder

A comprehensive web application for managing project proposals and generating customized resumes based on selected experiences.

## 🚀 Features

- **Proposal Management**: Create, edit, and track project proposals with client information
- **Resume Builder**: Generate tailored resumes based on proposal requirements
- **Experience Database**: Manage and categorize project experiences 
- **User Authentication**: Secure login with email/password and Microsoft SSO support
- **Template System**: Customizable resume templates with PDF generation
- **Team Collaboration**: User management and proposal notes system

## 🏗️ Architecture

- **Frontend**: React 18 + Vite (Port 5173)
- **Backend**: FastAPI + SQLAlchemy (Port 8001)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JWT tokens with bcrypt password hashing
- **PDF Generation**: Puppeteer for HTML-to-PDF conversion
 - **PDF Generation**: WeasyPrint (HTML-to-PDF)

## 📋 Prerequisites

- **Node.js** (v18 or higher recommended)
- **Python** (3.8 or higher)
- **PostgreSQL** database (we use Supabase)
- **uv** (Python package manager) - Install with: `curl -LsSf https://astral.sh/uv/install.sh | sh`

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd documaker
```

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
uv pip install -r requirements.txt

# Create and configure environment variables
# Create a file named .env and set your variables (see "Backend Environment Variables" below)

# Run database migrations
alembic upgrade head
```

Create your first user from the project root:

```bash
python backend/create_user.py
```

Start the backend server from the project root:

```bash
bash backend/start_backend.sh
```

The backend will be available at: `http://localhost:8001`

### 3. Frontend Setup

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: `http://localhost:5173`

### 4. Access the Application

1. Open your browser to `http://localhost:5173`
2. Log in with the user account you created
3. Start creating proposals and building resumes!

## 🔧 Development Workflow

### Backend Development

```bash
cd backend

# Create new database migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# From project root, run the dev server with auto-reload
bash backend/start_backend.sh
```

### Frontend Development

```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📁 Project Structure

```
documaker/
├── backend/                    # FastAPI Backend
│   ├── alembic/               # Database migrations
│   ├── routers/               # API route modules
│   ├── services/              # Business logic services
│   ├── static/                # Static files (images)
│   ├── models.py              # SQLAlchemy models
│   ├── schemas.py             # Pydantic schemas
│   ├── database.py            # Database configuration
│   ├── crud.py                # Database operations
│   ├── main.py                # FastAPI app entry point
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── context/           # React contexts
│   │   └── assets/            # Static assets
│   ├── public/                # Public assets
│   ├── package.json           # Node.js dependencies
│   └── vite.config.js         # Vite configuration
│
└── README.md                   # This file
```

## 🗄️ Database Schema

The application uses the following main entities:

- **Users**: User accounts and authentication
- **ProjectProposals**: Project proposals and RFPs
- **Clients & Contacts**: Client relationship management
- **Experiences**: Project experience database
- **Resumes**: Generated resumes with customization
- **Templates**: Resume templates for different formats

## 🔐 Authentication

The app supports two authentication methods:

1. **Email/Password**: Standard username/password authentication
2. **Microsoft SSO**: Azure AD integration (configured via environment variables)

User sessions are managed with JWT tokens and automatic refresh.

## 🌐 API Documentation

When the backend is running, you can access:

- **Interactive API Docs**: `http://localhost:8001/docs`
- **ReDoc Documentation**: `http://localhost:8001/redoc`
- **OpenAPI Schema**: `http://localhost:8001/openapi.json`

## 🎨 UI Features

- **Dark/Light Theme**: Toggle between themes with persistence
- **Responsive Design**: Works on desktop and mobile devices
- **Modal System**: Consistent modal dialogs throughout the app
- **Drag & Drop**: Reorder experiences in resume customization
- **Real-time Updates**: Optimistic UI updates for better UX

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
SECRET_KEY=your-super-secret-jwt-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI/OpenRouter (for AI features)
OPENAI_API_KEY=your-openai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

# Microsoft SSO (optional)
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-app-secret
```

On macOS (especially Apple Silicon), WeasyPrint may require system libraries. If PDF generation fails, install dependencies:

```bash
brew install cairo pango gdk-pixbuf libffi glib
```

### Frontend Configuration

The frontend automatically proxies API requests to the backend via Vite configuration.

## 🚀 Deployment

### Backend Deployment

1. Set up a PostgreSQL database
2. Configure environment variables
3. Run migrations: `alembic upgrade head`
4. Deploy using your preferred platform (Railway, Heroku, etc.)

### Frontend Deployment

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to your static hosting service
3. Configure environment variables for API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Backend won't start:**
- Check that your database is running and accessible
- Verify environment variables in `.env`
- Ensure all Python dependencies are installed

**Frontend can't connect to backend:**
- Verify backend is running on port 8001
- Check browser console for CORS errors
- Ensure Vite proxy configuration is correct

**Database migration errors:**
- Check database connection and permissions
- Verify migration files are not corrupted
- Try running `alembic current` to check migration state

**Authentication issues:**
- Clear browser local storage and cookies
- Check JWT token expiration settings
- Verify user exists in database

### Getting Help

If you encounter issues:

1. Check the browser console for frontend errors
2. Check backend logs for API errors
3. Verify database connectivity
4. Ensure all environment variables are set correctly

## 🔄 Development Tips

- **Hot Reload**: Both frontend and backend support hot reload during development
- **Database**: Use `alembic revision --autogenerate` to create migrations automatically
- **API Testing**: Use the built-in FastAPI docs at `/docs` for testing endpoints
- **State Management**: The app uses React Context for global state (Auth, Proposals, Resumes)
- **Styling**: CSS custom properties enable easy theme switching

---

**Happy Coding!** 🎉
